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
import { VictoryLine, VictoryArea, VictoryGroup, VictoryBar, VictoryTooltip, VictoryStack } from 'victory';
import VizGError from '../VizGError';
import BaseChart from './BaseChart';

/**
 * Class to handle visualization of spark charts.
 */
export default class InlineChart extends BaseChart {

    constructor(props) {
        super(props);
        this.sortDataBasedOnConfig = this.sortDataBasedOnConfig.bind(this);
    }

    render() {
        const { config, height, width } = this.props;
        const { chartArray, dataSets } = this.state;
        let chartComponents = [];
        let horizontal = false;
        const lineCharts = [];
        let areaCharts = [];
        let barCharts = [];

        chartArray.map((chart, chartIndex) => {
            switch (chart.type) {
                case 'spark-line':
                    Object.keys(chart.dataSetNames).map((dataSetName) => {
                        
                        lineCharts.push((
                            <VictoryGroup
                                key={`chart-${chart.id}-${chart.type}-${dataSetName}`}
                                data={dataSets[dataSetName]}
                                color={chart.dataSetNames[dataSetName]}
                                height={height}
                                width={width}
                                padding={0}
                                style={{
                                    data: {
                                        strokeWidth: config.strokeWidth || 0.5,
                                    },
                                }}

                            >
                                <VictoryLine
                                    domain={{ y: this.props.yDomain || null }}
                                />
                            </VictoryGroup>
                        ));
                    
                        return null;
                    });
                    break;
                case 'spark-area': {
                    const areaLocal = [];
                    Object.keys(chart.dataSetNames).map((dataSetName) => {
                        areaLocal.push((
                            <VictoryGroup
                                key={`chart-${chart.id}-${chart.type}-${dataSetName}`}
                                data={dataSets[dataSetName]}
                                style={{
                                    data: {
                                        fillOpacity: config.fillOpacity || 0.5,
                                        strokeWidth: config.strokeWidth || 0.5,
                                        fill: chart.dataSetNames[dataSetName],
                                        stroke: chart.dataSetNames[dataSetName],
                                    },
                                }}
                                height={height}
                                width={width}
                                padding={0}
                            >
                                <VictoryArea
                                    domain={{ y: this.props.yDomain || null }}
                                />
                            </VictoryGroup>
                        ));
                        return null;
                    });

                    if (chart.mode === 'stacked') {
                        areaCharts.push((
                            <VictoryStack
                                height={height}
                                width={width}
                                padding={0}
                            >
                                {areaLocal}
                            </VictoryStack>
                        ));
                    } else {
                        areaCharts = areaCharts.concat(areaLocal);
                    }
                    break;
                }
                case 'spark-bar': {
                    const localBar = [];

                    horizontal = horizontal || chart.orientation === 'left';

                    Object.keys(chart.dataSetNames).map((dataSetName) => {
                        localBar.push((
                            <VictoryBar
                                labels={d => `${config.x}:${d.x}\n${config.charts[chartIndex].y}:${d.y}`}
                                labelComponent={
                                    <VictoryTooltip
                                        orientation='bottom'
                                    />
                                }
                                data={dataSets[dataSetName]}
                                color={chart.dataSetNames[dataSetName]}
                                height={height}
                                width={width}
                                padding={0}
                            />
                        ));
                        return null;
                    });

                    if (chart.mode === 'stacked') {
                        barCharts.push((
                            <VictoryStack
                                height={height}
                                width={width}
                                padding={0}
                            >
                                {localBar}
                            </VictoryStack>
                        ));
                    } else {
                        barCharts = barCharts.concat(localBar);
                    }
                    break;
                }
                default:
                    throw new VizGError('InlineChart', 'Unsupported chart type defined in the config.');
            }
            return null;
        });

        if (areaCharts.length > 0) chartComponents = chartComponents.concat(areaCharts);
        if (lineCharts.length > 0) chartComponents = chartComponents.concat(lineCharts);
        if (barCharts.length > 0) {
            const barWidth =
                ((horizontal ? height : width) / (config.maxLength * (barCharts.length > 1 ? barCharts.length : 2))) - 3;
            chartComponents.push((
                <VictoryGroup
                    horizontal={horizontal}
                    offset={barWidth}
                    style={{ data: { width: barWidth } }}
                    height={height}
                    width={width}
                    padding={5}
                >
                    {barCharts}
                </VictoryGroup>
            ));
        }

        return (
            <div style={{ height, width }} >{chartComponents}</div>
        );
    }
}

InlineChart.defaultProps = {
    height: 100,
    width: 200,
};
