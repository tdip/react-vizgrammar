/*
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { VictoryLegend, VictoryContainer } from 'victory';
import ReactToolTip from 'react-tooltip';
import * as d3 from 'd3';
import feature from 'topojson-client/src/feature';
import _ from 'lodash';
import { getDefaultColorScale } from './helper';
import { CountryInfo, EuropeMap, WorldMap, USAMap } from './resources/MapData';
import VizGError from '../VizGError';
import './resources/css/map-chart.css';
import lightTheme from './resources/themes/victoryLightTheme';
import darkTheme from './resources/themes/victoryDarkTheme';

const USA_YOFFSET_FACTOR = 2;
const USA_XOFFSET_FACTOR = 0.8;
const USA_PROJECTION_SCALE = 600;
const EUROPE_PROJECTION_SCALE = 350;
const EUROPE_YOFFSET_FACTOR = 2;
const WORLD_PROJECTION_SCALE = 80;

export default class MapGenerator extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            mapData: [],
            markerData: [],
            config: props.config,
            projectionConfig: {},
            mapType: props.config.charts[0].mapType || 'world',
            mapDataRange: [],
            colorType: 'linear',
            ordinalColorMap: {},
            colorIndex: 0,
            colorScale: [],
        };
        this.chartConfig = null;
        this._handleMouseEvent = this._handleMouseEvent.bind(this);
    }

    componentDidMount() {
        const { metadata, config } = this.props;

        if (metadata !== null && config !== null) {
            this.chartConfig = config;
            this._handleDataReceived(this.props);
        }
    }

    static getDerivedStateFromProps(nextProps) {
        const { config } = nextProps;

        if (!this.chartConfig || !_.isEqual(config, this.chartConfig) || !(this.chartConfig.append === false)) {
            this.chartConfig = config;
            this.state.mapData = [];
            this.state.projectionConfig = {};
            this.state.mapType = nextProps.config.charts[0].mapType || 'world';
            this.state.mapDataRange = [];
            this.state.colorType = 'linear';
            this.state.ordinalColorMap = {};
            this.state.colorIndex = 0;
            this.state.colorScale = [];
        }
        this._handleDataReceived(nextProps);
    }

    componentWillUnmount() {
        this.setState({});
    }

    _handleMouseEvent(evt) {
        const { onClick } = this.props;
        const { mapData } = this.state;
        const data = mapData.filter(d => d.x === evt.id)[0];
        let dat = {};
        if (data) {
            dat = {};
            dat[data.x] = data.y;
            return onClick && onClick(dat);
        }
    }

    /**
     * This function converts the country name into
     * Alpha - 3 code in case a whole country name is given
     *
     * @param countryName
     * @private
     */
    _convertCountryNamesToCode(countryName) {
        if (countryName.length === 3) {
            return countryName;
        } else {
            const countryName1 = CountryInfo.filter(x => x.name === countryName);
            if (countryName1.length > 0) {
                return countryName1[0]['alpha-3'];
            } else {
                return countryName;
            }
        }
    }

    _getLinearColor(value) {
        return d3.scaleLinear()
            .range([this.state.colorScale[0], this.state.colorScale[1]]).domain(this.state.mapDataRange)(value);
    }

    /**
     * handles the data received by the component to render the map
     * @param props - current props of the component
     * @private
     */
    _handleDataReceived(props) {
        const { metadata, data, config } = props;
        let {
            projectionConfig,
            mapType,
            mapDataRange,
            mapData,
            colorType,
            ordinalColorMap,
            colorIndex,
            colorScale,
        } = this.state;
        const mapConfig = config.charts[0];
        const xIndex = metadata.names.indexOf(config.x);
        const yIndex = metadata.names.indexOf(mapConfig.y);

        if (xIndex === -1) {
            throw new VizGError('MapChart', "Unknown 'x' field is defined in the Geographical chart configuration.");
        }

        if (yIndex === -1) {
            throw new VizGError('MapChart', "Unknown 'y' field is defined in the Geographical chart configuration.");
        }

        colorScale = Array.isArray(mapConfig.colorScale) ? mapConfig.colorScale : getDefaultColorScale();
        mapType = mapConfig.mapType;
        switch (mapConfig.mapType) {
            case 'world':
                projectionConfig.scale = WORLD_PROJECTION_SCALE;
                break;
            case 'usa':
                projectionConfig.scale = USA_PROJECTION_SCALE;
                projectionConfig.yOffset = 800 / USA_YOFFSET_FACTOR;
                projectionConfig.xOffset = 800 / USA_XOFFSET_FACTOR;
                break;
            case 'europe':
                projectionConfig.scale = EUROPE_PROJECTION_SCALE;
                projectionConfig.yOffset = 800 / EUROPE_YOFFSET_FACTOR;
                break;
            default:
                throw new VizGError('MapChart', 'Unknown chart type defined in the Geographical chart config.');
        }
        colorType = metadata.types[yIndex].toLowerCase();
        if (metadata.types[yIndex].toLowerCase() === 'linear') {
            data.forEach((datum) => {
                const dataIndex = mapData.findIndex(obj => obj.x === this._convertCountryNamesToCode(datum[xIndex]));
                if (dataIndex >= 0) {
                    mapData[dataIndex].y = datum[yIndex];
                } else {
                    mapData.push({
                        givenName: datum[xIndex],
                        x: mapType === 'usa' ? datum[xIndex] : this._convertCountryNamesToCode(datum[xIndex]),
                        y: datum[yIndex],
                    });
                }
            });

            const chloropethMaxVal = config.chloropethRangeUpperbound ||
                (mapData.length > 0 ? _.maxBy(mapData, obj => obj.y).y : 0);
            const chloropethMinVal = config.chloropethRangeLowerbound ||
                (mapData.length > 0 ? _.minBy(mapData, obj => obj.y).y : 0);

            mapDataRange = [chloropethMinVal, chloropethMaxVal];
        } else {
            data.forEach((datum) => {
                if (!ordinalColorMap.hasOwnProperty(datum[yIndex])) {
                    if (colorIndex >= colorScale.length) {
                        colorIndex = 0;
                    }
                    ordinalColorMap[datum[yIndex]] = colorScale[colorIndex++];
                }

                mapData.push({
                    givenName: datum[xIndex],
                    x: mapType === 'usa' ? datum[xIndex] : this._convertCountryNamesToCode(datum[xIndex]),
                    y: datum[yIndex],
                });
            });
        }

        this.setState({
            projectionConfig,
            mapType,
            mapData,
            mapDataRange,
            colorType,
            ordinalColorMap,
            colorIndex,
            colorScale,
        });
    }

    render() {
        const { config, theme } = this.props;
        const { mapType, mapData, mapDataRange, colorType, ordinalColorMap } = this.state;
        const currentTheme = theme === 'light' ? lightTheme : darkTheme;
        let mapFeatureData = null;
        switch (mapType) {
            case 'world':
                mapFeatureData = WorldMap;
                break;
            case 'usa':
                mapFeatureData = USAMap;
                break;
            case 'europe':
                mapFeatureData = EuropeMap;
                break;
            default:
                throw new VizGError('MapChart', 'Unknown maptype defined in the config');
        }

        return (
            <div style={{ overflow: 'hidden', height: '100%', display: 'flex' }}>
                <div
                    style={{
                        width: '85%',
                        height: '100%',
                    }}
                >
                    <ComposableMap
                        projection="mercator"
                        projectionConfig={this.state.projectionConfig}
                        width={this.state.width}
                        heght={this.state.height}
                        style={{
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        <Geographies
                            geographyPaths={
                                feature(mapFeatureData, mapFeatureData.objects[Object.keys(mapFeatureData.objects)[0]])
                                    .features
                            }
                            disableOptimization
                        >
                            {
                                (geographies, projection) => {
                                    return geographies.map((geography, i) => {
                                        let dataTip = '';
                                        let toolTip = null;

                                        if (mapType === 'usa') {
                                            dataTip = mapData.filter(x => x.x === geography.properties.name);
                                        } else {
                                            dataTip = mapData.filter(x => x.x === geography.id);
                                        }
                                        if (dataTip.length > 0) {
                                            toolTip = '' +
                                                config.x + ' : ' + dataTip[0].givenName + ', ' +
                                                config.charts[0].y + ' : ' + dataTip[0].y;
                                        }

                                        return (
                                            <Geography
                                                key={i}
                                                data-tip={toolTip ? toolTip.toString() : ''}
                                                geography={geography}
                                                projection={projection}
                                                style={{
                                                    default: {
                                                        fill: dataTip.length > 0 ?
                                                            (colorType === 'linear' ?
                                                                this._getLinearColor(dataTip[0].y) :
                                                                ordinalColorMap[dataTip[0].y]) : currentTheme.map.style
                                                                    .default.fill,
                                                        stroke: currentTheme.map.style.default.stroke,
                                                        strokeWidth: currentTheme.map.style.default.strokeWidth,
                                                        outline: currentTheme.map.style.default.outline,
                                                    },
                                                    hover: {
                                                        fill: dataTip.length > 0 ?
                                                            (colorType === 'linear' ?
                                                                this._getLinearColor(dataTip[0].y) :
                                                                ordinalColorMap[dataTip[0].y]) :
                                                            currentTheme.map.style.hover.fill,
                                                        stroke: currentTheme.map.style.hover.stroke,
                                                        opacity: currentTheme.map.style.hover.opacity,
                                                        strokeWidth: currentTheme.map.style.hover.strokeWidth,
                                                        outline: currentTheme.map.style.hover.outline,
                                                    },
                                                    pressed: {
                                                        fill: currentTheme.map.style.pressed.fill,
                                                        outline: currentTheme.map.style.pressed.outline,
                                                    },
                                                }}
                                                onClick={this._handleMouseEvent}
                                            />);
                                    });
                                }
                            }
                        </Geographies>
                    </ComposableMap>
                    <ReactToolTip class="fontClass" />
                </div>
                {
                    mapData.length > 0 ?
                        <div style={{ width: '15%', height: '100%'}}>
                            {
                                colorType === 'linear' ?
                                    <svg width="100%" height="100%">
                                        <defs>
                                            <linearGradient id="grad1" x1="0%" y1="100%" x2="0%" y2="0%">
                                                <stop offset="0%" stopColor={this.state.colorScale[0]} stopOpacity={1} />

                                                <stop offset="100%" stopColor={this.state.colorScale[1]} stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                        <g className='legend'>
                                            <text
                                                style={{
                                                    fill: config.style ? (config.style.legendTitleColor ||
                                                        currentTheme.map.style.labels.title.fill) :
                                                        currentTheme.map.style.labels.title.fill,
                                                    fontSize: config.style ? (config.style.legendTitleSize ||
                                                        currentTheme.map.style.labels.title.fontSize) :
                                                        currentTheme.map.style.labels.title.fontSize,
                                                }}
                                                x={20}
                                                y={20}
                                            >
                                                {config.charts[0].y}
                                            </text>
                                            <text
                                                style={{
                                                    fill: config.style ? (config.style.legendTextColor ||
                                                        currentTheme.map.style.labels.legend.fill) :
                                                        currentTheme.map.style.labels.legend.fill,
                                                    fontSize: config.style ? (config.style.legendTextSize ||
                                                        currentTheme.map.style.labels.legend.fontSize) :
                                                        currentTheme.map.style.labels.legend.fontSize,
                                                }}
                                                x={37}
                                                y={37}
                                            >
                                                {this.state.mapDataRange[1]}
                                            </text>
                                            <text
                                                style={{
                                                    fill: config.style ? (config.style.legendTextColor ||
                                                        currentTheme.map.style.labels.legend.fill) :
                                                        currentTheme.map.style.labels.legend.fill,
                                                    fontSize: config.style ? (config.style.legendTextSize ||
                                                        currentTheme.map.style.labels.legend.fontSize) :
                                                        currentTheme.map.style.labels.legend.fontSize,
                                                }}
                                                x={37}
                                                y={132}
                                            >
                                                {this.state.mapDataRange[0]}
                                            </text>
                                            <rect x={20} y={30} fill='url(#grad1)' height={100} width={15} />
                                        </g>
                                    </svg>
                                    : <VictoryLegend
                                        containerComponent={<VictoryContainer responsive />}
                                        height={this.state.height}
                                        width={300}
                                        title="Legend"
                                        style={{
                                            title: {
                                                fontSize: config.style ? (config.style.legendTitleSize ||
                                                    currentTheme.map.style.labels.title.fontSize) :
                                                    currentTheme.map.style.labels.title.fontSize,
                                                fill: config.style ? (config.style.legendTitleColor ||
                                                    currentTheme.map.style.labels.title.fill) :
                                                    currentTheme.map.style.labels.title.fill,
                                            },
                                            labels: {
                                                fontSize: config.style ? (config.style.legendTextSize ||
                                                    currentTheme.map.style.labels.legend.fontSize) :
                                                    currentTheme.map.style.labels.legend.fontSize,
                                                fill: config.style ? (config.style.legendTextColor ||
                                                    currentTheme.map.style.labels.legend.fill) :
                                                    currentTheme.map.style.labels.legend.fill,
                                            },
                                        }}
                                        data={Object.keys(ordinalColorMap).map((name) => {
                                            return { name, symbol: { fill: ordinalColorMap[name] } };
                                        })}
                                    />
                            }
                        </div> : null
                }
            </div>
        );
    }
}

MapGenerator.defaultProps = {
    height: 800,
    width: 800,
};

MapGenerator.propTypes = {
    height: PropTypes.number,
    width: PropTypes.number,
    config: PropTypes.object.isRequired,
    mapData: PropTypes.array,
    metadata: PropTypes.object,
    colorRange: PropTypes.array,
    colorScale: PropTypes.array,
    colorType: PropTypes.string,
    onClick: PropTypes.func,
};
