import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DynoDataHandler } from './dynoDataHandler';
import { Latex } from './latex';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('open file', () => {
    it('should open and parse the file', async () => {
      const filePath = '/Users/lukas/Documents/LocalProjects/DocGenerator/data/SRTP3-002882.093';
      const dynoDataHandler = new DynoDataHandler(filePath);

      // Listen for the 'finish' event
      const onFinishPromise = new Promise<void>((resolve) => {
        dynoDataHandler.on('finish', () => {
          resolve();
        });
      });

      // Ensure that the asynchronous file parsing operation is complete before finishing the test
      await onFinishPromise;

      // Your assertions and expectations here
    });
  });

  describe('create pdf', () => {
    it('should create a pdf document', async () => {
      const latex = new Latex();
      latex.main();

      // Listen for the 'finish' event
      const onFinishPromise = new Promise<void>((resolve) => {
        latex.on('finish', () => {
          resolve();
        });
      });

      // Ensure that the asynchronous file parsing operation is complete before finishing the test
      await onFinishPromise;
    }, 10000);
  });
});
