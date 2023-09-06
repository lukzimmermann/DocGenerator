import { Test } from '@nestjs/testing';
import { channel } from 'diagnostics_channel';
import { EventEmitter } from 'events';

const fs = require('fs');

export class DataSet {
  constructor(testIndicator = 'Test_State') {
    this.testIndicator = testIndicator;
    this.parseErrors = [];
  }
  file: string;
  channels: Channel[];
  testIndicator: string;
  parseErrors: string[];
}

class Channel {
  constructor(name) {
    this.name = name;
    this.data = [];
    this.testPoints = [];
  }
  name: string;
  unit: string;
  data: number[];
  testPoints: TestPoint[];
}

class TestPoint {
  constructor() {
    this.data = [];
  }
  data: number[];
  average: number;
  min: number;
  max: number;
}

interface Result {
  mean: number;
  min: number;
  max: number;
}

export class DynoDataHandler extends EventEmitter {
  dataSet;

  constructor(filePath: string) {
    super(); // Call the constructor of EventEmitter
    const timerName = 'RunTime';
    console.time(timerName);

    fs.readFile(filePath, 'latin1', async (err, data) => {
      if (err) {
        console.log('Error: ', err);
      } else {
        this.dataSet = new DataSet();
        this.dataSet = await this.parseFile(data);
        //dataSet.testPoints = this.getTestPoints(dataSet, 'Test_State');
        console.timeEnd(timerName);
        console.log(this.dataSet.parseErrors);
        this.emit('finish'); // Emit the 'finish' event when parsing is done
      }
    });
  }

  parseFile(data) {
    let dataSet = new DataSet();

    const lines = this.getLinesOfString(data);
    const channelList: Channel[] = [];
    for (const [index, value] of lines.entries()) {
      const elements = value.split('\t');
      for (let i = 0; i < elements.length; i++) {
        if (index === 0) {
          const channel = new Channel(elements[i]);
          channelList.push(channel);
        } else if (index === 1) {
          channelList[i].unit = `[${elements[i]}]`;
        } else {
          const dataPoint = parseFloat(elements[i]);
          if (!Number.isNaN(dataPoint)) {
            channelList[i].data.push(dataPoint);
          } else {
            dataSet.parseErrors.push(`${index + 1}:${channelList[i].name}`);
            break;
          }
        }
      }
    }

    this.printChannel(channelList, 39);
    dataSet.channels = channelList;
    dataSet = this.calculateTestPoints(dataSet, dataSet.testIndicator);

    return dataSet;
  }

  calculateTestPoints(dataSet: DataSet, testPointIndicator: string, threshold: number = 500, minLength: number = 15) {
    const testChannel = this.getChannelByName(dataSet.channels, testPointIndicator);
    let isTestActive = false;
    for (const [indexChannel, channel] of dataSet.channels.entries()) {
      let values = [];
      for (const [indexDataPoint, dataPoint] of channel.data.entries()) {
        if (testChannel.data[indexDataPoint] >= threshold && isTestActive === false) {
          isTestActive = true;
          values.push(dataPoint);
        }

        if (testChannel.data[indexDataPoint] >= threshold && isTestActive === true) {
          values.push(dataPoint);
        }

        if (testChannel.data[indexDataPoint] < threshold && isTestActive === true) {
          isTestActive = false;
          let testPoint = new TestPoint();
          if (values.length > minLength) {
            const { mean, min, max } = this.processArray(values);
            testPoint.average = mean;
            testPoint.min = min;
            testPoint.max = max;
            testPoint.data = values;
            channel.testPoints.push(testPoint);
          }
          values = [];
        }
      }
    }
    //BSFC 39
    this.printTestPoint(dataSet.channels, 39, 0, 14);

    return dataSet;
  }

  printChannel(channels: Channel[], index: number, from: number = 0, to: number = 5) {
    console.log(
      channels[index].name +
        ' ' +
        channels[index].unit +
        '\n' +
        channels[index].data.slice(from, to) +
        '\nlen: ' +
        channels[index].data.length,
    );
  }

  printTestPoint(channels: Channel[], index: number, from: number = 0, to: number = 5) {
    let text = '';
    text += channels[index].name + ' ' + channels[index].unit + '\n';
    for (const point of channels[index].testPoints) {
      text += point.average + '\n';
    }
    text += 'len: ' + channels[index].testPoints.length;
    console.log(text);
  }

  getLinesOfString(data: string) {
    const lines = data.split('\n');
    return lines.slice(0, -1);
  }

  processArray(data: number[]) {
    let sum = 0;
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    for (const number of data) {
      if (min > number) min = number;
      if (max < number) max = number;
      sum += number;
    }

    const result: Result = {
      mean: sum / data.length,
      min: min,
      max: max,
    };

    return result;
  }

  getChannelByName(channels: Channel[], channelName: string) {
    for (const channel of channels) {
      if (channel.name === channelName) return channel;
    }
  }
}
