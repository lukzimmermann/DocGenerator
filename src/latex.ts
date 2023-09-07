import { exec } from 'child_process';
import { EventEmitter } from 'events';

interface Output {
  stdout: string;
  stderr: string;
}

export class Latex extends EventEmitter {
  constructor() {
    super();
  }

  executeShellCommand(cmd) {
    return new Promise<Output>(function (resolve, reject) {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  async main() {
    console.time('Timer');
    await this.executeShellCommand('pdflatex /Users/lukas/Documents/LocalProjects/DocGenerator/src/Graphes.tex hihi');
    console.timeEnd('Timer');
    this.emit('finish');
  }
}
