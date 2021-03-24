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
import ReactTable from 'react-table';
import { scaleLinear, timeFormat } from 'd3';
import 'react-table/react-table.css';
import _ from 'lodash';
import './resources/css/tableChart.css';
import { getDefaultColorScale } from './helper';
import VizGError from '../VizGError';
import BaseChart from './BaseChart';

const DAFAULT_ROW_COUNT_FOR_PAGINATION = 5;

/**
 * Class to handle visualization of table charts.
 */
export default class TableChart extends BaseChart {
    constructor(props) {
        super(props);
        this.state = {
            dataSets: [],
            chartArray: [],
            initialized: false,
            filterValue: '',
            number: 0,
            selected: null,
            loading: props.manual, // for loading animation when server-side pagination enabled
        };

        this.chartConfig = props.config;

        this.sortDataBasedOnConfig = this.sortDataBasedOnConfig.bind(this);
        this._getLinearColor = this._getLinearColor.bind(this);
        this.idColumn = this.uuidv4();
    }

    componentDidMount() {
        if (this.props.config && this.props.metadata) {
            this.sortDataBasedOnConfig(this.props);
        }
    }

    handleRowSelect(e, row) {
        const { onClick } = this.props;

        this.setState({ selected: row.original[this.idColumn] });

        return onClick && onClick(row.original);
    }

    static getDerivedStateFromProps(nextProps) {
        if (!this.chartConfig || !_.isEqual(nextProps.config, this.chartConfig) || !this.props.append) {
            this.state.initialized = false;
            this.state.dataSets = [];
            this.state.chartArray = [];
            this.state.selected = null;
            this.chartConfig = nextProps.config;
        }

        this.setState({ loading: false });
        this.sortDataBasedOnConfig(nextProps);
    }

    sortDataBasedOnConfig(props) {
        let { config, metadata, data } = props;
        let { dataSets, chartArray, initialized, number } = this.state;

        let key = config.charts[0].uniquePropertyColumn;

        data = data.map((d) => {
            const tmp = {};
            for (let i = 0; i < metadata.names.length; i++) {
                tmp[metadata.names[i]] = d[i];
            }
            tmp[this.idColumn] = number++;
            return tmp;
        });

        if (key) {
            dataSets = _.unionBy(dataSets, data, key);
        } else {
            dataSets = dataSets.concat(data);
        }

        while (dataSets.length > config.maxLength) {
            dataSets.shift();
        }

        config.charts.forEach((chart) => {
            chart.columns.forEach((column, i) => {
                const colIndex = _.indexOf(metadata.names, column.name);

                if (colIndex === -1) {
                    throw new VizGError('TableChart', 'Unknown column name defined in the chart config.');
                }

                if (!initialized) {
                    chartArray.push({
                        name: column.name,
                        title: column.title || column.name,
                        highLight: !!column.highlight,
                        colorBasedStyle: column.colorBasedStyle,
                        colorScale: column.colorBasedStyle === true ?
                            column.colorScale || getDefaultColorScale() : undefined,
                        colorDomain: column.colorDomain,
                        isTime: metadata.types[colIndex].toLowerCase() === 'time',
                        colorIndex: 0,
                        timeFormat: column.timeFormat,
                        textColor: column.textColor,
                    });
                }

                if (column.colorBasedStyle === true) {
                    if (metadata.types[colIndex].toLowerCase() === 'linear' ||
                        metadata.types[colIndex].toLowerCase() === 'time') {
                        const max = _.max(dataSets.map(datum => datum[metadata.names[colIndex]]));
                        const min = _.min(dataSets.map(datum => datum[metadata.names[colIndex]]));

                        if (!Object.prototype.hasOwnProperty.call(chartArray[i], 'range')) {
                            chartArray[i].range = [min, max];
                        } else if (!_.isEqual(chartArray[i].range, [min, max])) {
                            chartArray[i].range = [min, max];
                        }
                    } else {
                        if (!Object.prototype.hasOwnProperty.call(chartArray[i], 'colorMap')) {
                            chartArray[i].colorIndex = 0;
                            chartArray[i].colorMap = {};
                        }

                        _.map(dataSets, column.name).forEach((category) => {
                            if (!Object.prototype.hasOwnProperty.call(chartArray[i].colorMap, category)) {
                                if (chartArray[i].colorIndex >= chartArray[i].colorScale.length) {
                                    chartArray[i].colorIndex = 0;
                                }

                                if (column.colorDomain) {
                                    const domainIndex = _.indexOf(column.colorDomain, category);

                                    if (domainIndex >= 0 && domainIndex < chartArray[i].colorScale.length) {
                                        chartArray[i].colorMap[category] = chartArray[i].colorScale[domainIndex];
                                    } else {
                                        chartArray[i].colorMap[category] =
                                            chartArray[i].colorScale[chartArray[i].colorIndex++];
                                    }
                                } else {
                                    chartArray[i].colorMap[category] =
                                        chartArray[i].colorScale[chartArray[i].colorIndex++];
                                }
                            }
                        });
                    }
                }
            });
        });

        initialized = true;

        this.setState({ dataSets, chartArray, initialized, number });
    }

    _getLinearColor(color, range, value) {
        return scaleLinear().range(['#fff', color]).domain(range)(value);
    }

    render() {
        const { config, metadata, manual, onFetchData, pages } = this.props;
        const { dataSets, chartArray, filterValue, selected } = this.state;

        const tableConfig = chartArray.map((column) => {
            const columnConfig = {
                Header: column.title,
                accessor: column.name,
                getProps: (state, rowInfo) => column.highLight &&
                    typeof config.dataFunction === 'function' ? config.dataFunction(state, rowInfo) : '',
                };

            if (column.colorBasedStyle === true) {
                columnConfig.Cell = props => (
                    <div
                        style={{
                            width: '100%',
                            backgroundColor:
                                props.original[this.idColumn] === selected ?
                                    config.selectedBackground || '#4286f4' :
                                    column.range ?
                                        this._getLinearColor(
                                            column.colorScale[column.colorIndex], column.range, props.value) :
                                        column.colorMap[props.value],
                            margin: 0,
                            textAlign: metadata.types[metadata.names.indexOf(props.column.id)] === 'linear' ||
                                metadata.types[metadata.names.indexOf(props.column.id)] === 'time' ?
                                'right' : 'left',
                            borderRight: '1px solid rgba(0,0,0,0.02)',
                        }}
                    >
                        <span
                            style={{
                                color: column.textColor || null,
                                width: '100%',
                            }}
                        >
                            {
                                column.isTime && column.timeFormat ?
                                    timeFormat(column.timeFormat)(props.value) : props.value
                            }
                        </span>
                    </div>
                );
            } else {
                columnConfig.Cell = props => (
                    <div
                        className={this.props.theme === 'light' ? 'rt-td' : 'cell-data'}
                        style={{
                            background: props.original[this.idColumn] === selected ?
                                config.selectedBackground || '#4286f4' : null,
                            color: config.selectedTextColor || null,
                            width: '100%',
                            textAlign: metadata.types[metadata.names.indexOf(props.column.id)] === 'linear' ||
                                metadata.types[metadata.names.indexOf(props.column.id)] === 'time' ?
                                'right' : 'left',
                        }}
                    >
                        <span
                            style={{
                                width: '100%',
                            }}
                        >
                            {
                                column.isTime && column.timeFormat ?
                                    timeFormat(column.timeFormat)(props.value) : props.value
                            }
                        </span>
                    </div>
                );
            }

            return columnConfig;
        });


        const filteredData = _.filter(dataSets, (obj) => {
            return _.values(obj).toString().toLowerCase().includes(filterValue.toLowerCase());
        });

        let manualProps = {};

        if (manual) {
            manualProps = {
                onFetchData: (state, instance) => {
                    this.setState({ loading: true });
                    return onFetchData(state, instance);
                },
                pages,
            };
        }
        let sortable = true;
        if (config.sortable === false) {
            sortable = false;
        }

        return (
            <div>
                {
                    config.filterable ?
                        <div className={this.props.theme === 'light' ? 'lightTheme filter-search-container' : 'darkTheme filter-search-container'} >
                            <input
                                className={this.props.theme === 'light' ? 'lightTheme filter-search' : 'darkTheme filter-search'}
                                type="text"
                                onChange={(evt) => {
                                    this.setState({ filterValue: evt.target.value });
                                }}
                                placeholder="Enter value to filter data"
                            />
                        </div> : null
                }
                <div>
                    <ReactTable
                        data={filteredData}
                        columns={tableConfig}
                        showPagination={config.pagination === true}
                        sortable={sortable}
                        minRows={DAFAULT_ROW_COUNT_FOR_PAGINATION}
                        className={this.props.theme === 'light' ? 'lightTheme' : 'darkTheme'}
                        getTrProps={
                            (state, rowInfo) => {
                                return {
                                    onClick: (e) => {
                                        return this.handleRowSelect(e, rowInfo);
                                    },
                                };
                            }
                        }
                        defaultPageSize={
                            config.pagination === true ?
                                DAFAULT_ROW_COUNT_FOR_PAGINATION : config.maxLength
                        }
                        manual={manual}
                        {...manualProps}
                        loading={this.state.loading}
                    />
                </div>
            </div>
        );
    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
