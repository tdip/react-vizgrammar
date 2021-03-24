/*
 * Copyright (c) 2018, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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
import _ from 'lodash';
import PropTypes from 'prop-types';
import VizGError from '../VizGError';
import { getDefaultColorScale } from './helper';

/**
 * Base Chart that contain most common methods that requires for the charts.
 */
export default class BaseChart extends React.Component {
    state = {
        externalData: null,
      };
    /**
     * returns which x scale to be used for the current chart based on the metadata type.
     * @param {String} type - type defined in the metadata one of values 'linear', 'ordinal', or 'time'
     * @returns {string} type of the xScale that should be used in the chart.
     */
    static getXScale(type) {
        switch (type.toLowerCase()) {
            case 'linear':
                return 'linear';
            case 'ordinal':
                return 'ordinal';
            default:
                return 'time';
        }
    }

    /**
     * returns a dataSet object that contains arrays not longer than maxLength provided
     * @param {Object} dataSets
     * @param {number} maxLength
     * @returns {*}
     */
    static trimDataSet(dataSets, maxLength) {
        _.keys(_.pickBy(dataSets, obj => obj.length > maxLength)).forEach((key) => {
            const lengthDiff = dataSets[key].length - maxLength;
            dataSets[key].splice(0, lengthDiff);
        });

        return dataSets;
    }

    /**
     * Generates an array of objects containing chart information that needed to be plotted.
     * @param {Array} charts - Charts array provided in the config.
     * @returns {Array} - Array of objects containing chart information that needed to be plotted
     */
    static generateChartArray(charts) {
        return charts.map((chart, chartIndex) => {
            return {
                type: chart.type,
                dataSetNames: {},
                mode: chart.mode,
                orientation: chart.orientation || 'bottom',
                color: Object.prototype.hasOwnProperty.call(chart, 'color'),
                colorCategoryName: chart.color || '',
                colorScale: Array.isArray(chart.colorScale) ? chart.colorScale : getDefaultColorScale(),
                colorDomain: chart.colorDomain || [],
                colorIndex: chartIndex,
                id: chartIndex,
                y: chart.y,
                x: chart.x,
                size: chart.size,
            };
        });
    }

    constructor(props) {
        super(props);
        this.state = {
            chartArray: [],
            dataSets: {},
            xScale: 'linear',
            ignoreArray: [],
            isOrdinal: false,
            stacked: false,
            xAxisRange: [null, null],
            xAxisType: 'linear',
        };

        this.chartConfig = this.props.config;

        this.sortDataBasedOnConfig = this.sortDataBasedOnConfig.bind(this);
    }

    componentDidMount() {
        this.sortDataBasedOnConfig(this.props);
    }

    getDerivedStateFromProps(nextProps) {
        console.log(next)
        const { config } = nextProps;

        if (!this.chartConfig || !(_.isEqual(config, this.chartConfig)) || !this.props.append) {
            this.state.chartArray = [];
            this.state.dataSets = {};
            this.chartConfig = config;
        }

        this.sortDataBasedOnConfig(nextProps);
    }

    /**
     * Event handler for mouse events
     * @param evt - event associated with the interaction.
     * @returns {*}
     */
    handleMouseEvent(props) {
        const { onClick } = this.props;
        const data = {};

        data[this.chartConfig.x] = props.datum.x;
        data[props.datum.yName] = props.datum.y;
        data.colorCategory = props.datum.color;

        return onClick && onClick(data);
    }

    /**
     * Event handler for onClick events of names shown in the legend.
     * @param props
     */
    handleLegendInteraction(props) {
        const { ignoreArray } = this.state;

        const ignoreIndex = _.indexOf(ignoreArray, props.datum.name);
        if (ignoreIndex < 0) {
            ignoreArray.push(props.datum.name);
        } else {
            ignoreArray.splice(ignoreIndex, 1);
        }

        this.state.ignoreArray = ignoreArray;

        this.forceUpdate();
    }

    /**
     * Sort and set the state with data received from props.
     * @param props - props received by the component.
     */
    sortDataBasedOnConfig(props) {
        const { config, metadata, data } = props;
        let { chartArray, dataSets, xScale, isOrdinal, xAxisType } = this.state;
        // generate chart array from the config.
        if (chartArray.length === 0) chartArray = BaseChart.generateChartArray(config.charts);

        const xIndex = metadata.names.indexOf(config.x);
        if (_.keys(dataSets).length === 0) {
            if (!isOrdinal) isOrdinal = metadata.types[xIndex].toLowerCase() === 'ordinal';
            xScale = BaseChart.getXScale(metadata.types[xIndex]);
            xAxisType = metadata.types[xIndex];
        }
        if (xScale !== BaseChart.getXScale(metadata.types[xIndex])) {
            throw VizGError('BasicChart', "Provided metadata doesn't match the previous metadata.");
        }

        let dataSet = {};

        chartArray.forEach((chart) => {
            const yIndex = metadata.names.indexOf(chart.y);
            const colorIndex = metadata.names.indexOf(chart.colorCategoryName);

            if (xIndex < 0 || yIndex < 0) {
                throw new VizGError('BasicChart', 'Axis name not found in metadata');
            }

            if (chart.color) {
                if (colorIndex < 0) {
                    throw new VizGError('BasicChart', 'Color category not found in metadata.');
                }
                dataSet = _.groupBy(data.map(
                    datum => ({
                        x: datum[xIndex] instanceof Date ? datum[xIndex].getTime() : datum[xIndex],
                        y: datum[yIndex],
                        color: datum[colorIndex],
                        yName: metadata.names[yIndex],
                    })), d => d.color);

                _.difference(_.keys(dataSet), _.keys(chart.dataSetNames)).forEach((key) => {
                    const colorDomIn = _.indexOf(chart.colorDomain, key);
                    if (chart.colorIndex >= chart.colorScale.length) {
                        chart.colorIndex = 0;
                    }
                    if (colorDomIn < 0) {
                        chart.dataSetNames[key] = chart.colorScale[chart.colorIndex++];
                    } else if (colorDomIn > chart.colorScale.length) {
                        chart.dataSetNames[key] = chart.colorScale[0];
                    } else {
                        chart.dataSetNames[key] = chart.colorScale[colorDomIn];
                    }
                });
            } else {
                dataSet[chart.y] = data.map(datum => ({ x: datum[xIndex], y: datum[yIndex], yName: chart.y }));
                chart.dataSetNames[chart.y] = config.charts[chart.id].fill || chart.colorScale[chart.colorIndex];
            }
        });

        this.setState((prevState) => {
            prevState.chartArray.push(...(_.differenceWith(chartArray, prevState.chartArray, _.isEqual)));
            if (!isOrdinal) {
                if (_.isEmpty(prevState.dataSets) || !_.isEqual(_.sortBy(prevState.dataSets), _.sortBy(dataSet))) {
                    _.mergeWith(prevState.dataSets, dataSet, (objValue, srcValue) => {
                    if (_.isArray(objValue)) {
                        return objValue.concat(srcValue);
                    }
                });
                }
            } else {
                _.keys(dataSet).forEach((key) => {
                    prevState.dataSets[key] = prevState.dataSets[key] || [];
                    dataSet[key].forEach((datum) => {
                        const objIndex = _.findIndex(prevState.dataSets[key], obj => obj.x === datum.x);
                        if (objIndex > -1) {
                            prevState.dataSets[key][objIndex].y = datum.y;
                        } else {
                            prevState.dataSets[key].push(datum);
                        }
                    });
                });
            }

            _.keys(prevState.dataSets).forEach(key => _.sortBy(prevState.dataSets[key], o => o.x));
            if (config.maxLength) BaseChart.trimDataSet(prevState.dataSets, config.maxLength);
            prevState.isOrdinal = isOrdinal;
            prevState.xScale = xScale;


            if (!isOrdinal) {
                let range = [null, null];

                Object.keys(prevState.dataSets).forEach((key) => {
                    const dataSetRange = [];
                    dataSetRange[0] = _.minBy(prevState.dataSets[key], 'x');
                    dataSetRange[1] = _.maxBy(prevState.dataSets[key], 'x');

                    if (dataSetRange[0]) {
                        dataSetRange[0] = dataSetRange[0].x;
                    }
                    if (dataSetRange[1]) {
                        dataSetRange[1] = dataSetRange[1].x;
                    }
                    if (!range[0]) {
                        range = dataSetRange;
                    } else {
                        if (dataSetRange[0] < range[0]) {
                            range[0] = dataSetRange[0];
                        }

                        if (dataSetRange[1] > range[1]) {
                            range[1] = dataSetRange[1];
                        }
                    }
                });

                prevState.xAxisRange = range;
            }

            prevState.xAxisType = xAxisType;

            return prevState;
        });
    }

    render() {
        return (
            <div />
        );
    }
}

BaseChart.defaultProps = {
    width: 800,
    height: 400,
    onClick: null,
    yDomain: null,
    append: true,
};

BaseChart.propTypes = {
    width: PropTypes.number,
    height: PropTypes.number,
    onClick: PropTypes.func,
    config: PropTypes.shape({
        x: PropTypes.string,
        charts: PropTypes.arrayOf(PropTypes.shape({
            type: PropTypes.string.isRequired,
            y: PropTypes.string,
            fill: PropTypes.string,
            color: PropTypes.string,
            colorScale: PropTypes.arrayOf(PropTypes.string),
            colorDomain: PropTypes.arrayOf(PropTypes.string),
            mode: PropTypes.string,
        })),
        legendOrientation: PropTypes.string,
        style: {
            tickLabelColor: PropTypes.string,
            legendTitleColor: PropTypes.string,
            legendTextColor: PropTypes.string,
            axisColor: PropTypes.string,
            axisLabelColor: PropTypes.string,
            gridColor: PropTypes.string,
            xAxisTickAngle: PropTypes.number,
            yAxisTickAngle: PropTypes.number,
        },
        disableVerticalGrid: PropTypes.bool,
        disableHorizontalGrid: PropTypes.bool,
        xAxisLabel: PropTypes.string,
        yAxisLabel: PropTypes.string,
        yAxisTickCount: PropTypes.number,
        xAxisTickCount: PropTypes.number,
        height: PropTypes.number,
        width: PropTypes.number,
        maxLength: PropTypes.number,
    }).isRequired,
    yDomain: PropTypes.arrayOf(PropTypes.number),
    append: PropTypes.bool,
};
