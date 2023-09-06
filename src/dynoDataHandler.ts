import { EventEmitter } from 'events';

const fs = require('fs');

export interface DataSet {
  file: string;
  channel: Channel[];
}

interface Channel {
  name: string;
  unit: string;
  data: number[];
}

export class DynoDataHandler extends EventEmitter {
  constructor(filePath: string) {
    super(); // Call the constructor of EventEmitter

    fs.readFile(filePath, 'utf8', async (err, data) => {
      if (err) {
        console.log('Error: ', err);
      } else {
        await this.parseFile(data);
        this.emit('finish'); // Emit the 'finish' event when parsing is done
      }
    });
  }

  parseFile(data) {
    const lines = this.getLinesOfString(data);
    console.log(lines[0]);
  }

  getLinesOfString(data: string) {
    return data.split('\n');
  }
}
