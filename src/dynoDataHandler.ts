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
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

interface Result {
  average: number;
  median: number;
  q1: number;
  q3: number;
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
        console.timeEnd(timerName);

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
            const { average, median, q1, q3, min, max } = this.processArray(values);
            testPoint.average = this.round(average, 100);
            testPoint.median = this.round(median, 100);
            testPoint.q1 = this.round(q1, 100);
            testPoint.q3 = this.round(q3, 100);
            testPoint.min = this.round(min, 100);
            testPoint.max = this.round(max, 100);
            testPoint.data = values;
            channel.testPoints.push(testPoint);
          }
          values = [];
        }
      }
    }
    //Power 36
    //BSFC  39
    //RPM   26
    this.printTestPoint(dataSet.channels, 26, 0, 14);

    return dataSet;
  }

  round(number: number, decimal: number) {
    return Math.round(number * decimal) / decimal;
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
    const width = 6;
    text += channels[index].name + ' ' + channels[index].unit + '\n';
    for (const point of channels[index].testPoints) {
      text +=
        point.average.toString().padStart(width) +
        '\t' +
        point.min.toString().padStart(width) +
        '\t' +
        point.q1.toString().padStart(width) +
        '\t' +
        point.median.toString().padStart(width) +
        '\t' +
        point.q3.toString().padStart(width) +
        '\t' +
        point.max.toString().padStart(width) +
        '\n';
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

    data.sort((a, b) => a - b);
    const [median, q1, q3] = this.getMedian(data);

    const result: Result = {
      average: sum / data.length,
      median: median,
      q1: q1,
      q3: q3,
      min: min,
      max: max,
    };

    return result;
  }

  getMedian(sortedList: number[]): [median: number, q1: number, q3: number] {
    const middleIndex = Math.floor(sortedList.length / 2);
    const median = this.calculateMedian(sortedList);
    const q1 = this.calculateMedian(sortedList.slice(0, middleIndex));
    const q3 = this.calculateMedian(sortedList.slice(middleIndex, sortedList.length - 1));
    return [median, q1, q3];
  }

  calculateMedian(sortedList: number[]) {
    const middleIndex = Math.floor(sortedList.length / 2);
    if (sortedList.length % 2 === 0) {
      const middleElements = sortedList.slice(middleIndex - 1, middleIndex + 1);
      const median = middleElements.reduce((a, b) => a + b) / middleElements.length;
      return median;
    } else {
      const median = sortedList[middleIndex];
      return median;
    }
  }

  getChannelByName(channels: Channel[], channelName: string) {
    for (const channel of channels) {
      if (channel.name === channelName) return channel;
    }
  }
}
