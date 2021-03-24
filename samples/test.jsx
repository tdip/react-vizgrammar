import React from 'react';
import VizG from '../src/VizG';

export default class Test extends React.Component {
    render(){
        const sampleDataset = [
            [10, 20, 30, 'test1'],
            [11, 89, 30, 'test2'],
            [12, -6, 30, 'test1'],
            [13, 15, 30, 'test2'],
            [14, 30, 30, 'test1'],
            [15, 20, 30, 'test2'],
            [16, 34, 30, 'test1'],
            [17, 90, 30, 'test2'],
            [18, 70, 30, 'test1'],
            [19, 60, 30, 'test2'],
            [20, 50, 30, 'test1'],
            [21, 0, 30, 'test2'],
            [22, 20, 30, 'test1'],
            [23, 20, 30, 'test2'],
            [24, 30, 30, 'test1'],
            [25, 40, 30, 'test2'],
            [26, 35, 30, 'test1'],
            [27, 45, 30, 'test2'],
            [28, 50, 30, 'test1'],
            [29, 60, 30, 'test2'],
            [30, 70, 30, 'test1'],
            [30, 70, 30, 'test1'],
            [30, 70, 30, 'test1'],
            [30, 70, 30, 'test1'],
        ];

        const config = {x: 'rpm',
        charts: [{ y: 'torque', color: 'EngineType', type: 'line' }],
        legend: true,
        maxLength: 30,}

        const meta = {
            names: ['rpm', 'torque', 'horsepower', 'EngineType', 'weight'],
            types: ['linear', 'linear', 'linear', 'ordinal', 'linear'],
        }
        return(
            <div>
                <VizG config={config} metadata={meta} data={sampleDataset}/>
            </div>
        )
    }
}