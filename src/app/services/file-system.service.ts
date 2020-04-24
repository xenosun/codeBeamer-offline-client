/**
 * Copyright 2020 Intland Software GmbH
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {Injectable} from '@angular/core';
import {
  DirectoryEntry,
  File as IonicFile,
  FileEntry
} from '@ionic-native/file/ngx';
import {TestRun} from '../models/test-run';
import {TestCase} from '../models/test-case';
import {DownloadedTestRun} from '../models/downloaded-test-run';
import {InitializedTestCase} from '../models/initialized-test-case';
import {Attachment} from '../models/attachment';
import {AppService} from './app.service';
import {LogProvider} from './ionic-log-file-appender/log.service';

@Injectable()
export class FileSystemService {

  constructor(
    private file: IonicFile,
    private appService: AppService,
    private logger: LogProvider,
  ) {
  }

  /**
   * Remove the previously downloaded attachments of the given test run,
   * as well as the user created content (pictures, attachments, etc).
   */
  public async removeAttachmentsOfDownloadedTestRun(downloadedTestRun: DownloadedTestRun): Promise<void> {
    await Promise.all([
      this.removeTestCaseOrRunAttachment(downloadedTestRun.initializedTestRun.testRun),
      ...downloadedTestRun.initializedTestCases.map(async (initializedTestCase: InitializedTestCase) =>
        this.removeTestCaseOrRunAttachment(initializedTestCase.testCaseTrackerItem))
    ]);
  }

  /**
   * Store the given file (or blob) with the given name on the given path in the
   * file system.
   *
   * The file will be stored at the place reserved specifically for this application
   * on the device.
   *
   * @param path absolute path for the file
   * @param fileName file's name
   */
  public async storeFile(path: string, fileName: string, file: File | Blob): Promise<FileEntry> {
    try {
      let fileExists = true;
      try {
        fileExists = await this.file.checkFile(path, fileName);
      } catch (err) {
        fileExists = false;
      }
      if (fileExists) {
        const directoryEntry: DirectoryEntry = await this.file.resolveDirectoryUrl(path);
        return await this.file.getFile(directoryEntry, fileName, null);
      }
      return await this.file.writeFile(path, fileName, file, {
        replace: false,
        append: false
      });
    } catch (err) {
      const errorMessage = 'Failed to store file!';
      this.logger.err(errorMessage, err);
      await this.appService.notifyUserAboutError(errorMessage);
    }
  }

  private async removeAttachments(attachments: Attachment[]): Promise<void> {
    if (!attachments || !attachments.length) {
      return;
    }
    await Promise.all(
      attachments.map(async (attachment: Attachment) => {
        try {
          const removeResult = await this.file.removeFile(attachment.directory, attachment.name);
          if (!removeResult.success) {
            console.error('File remove unsuccessful!', attachment);
          }
        } catch (err) {
          console.error('Error during removing attachment', attachment, err);
        }
      })
    );
  }

  private async removeTestCaseOrRunAttachment(testCaseOrRun: TestRun | TestCase): Promise<void> {
    if (!testCaseOrRun.comments || !testCaseOrRun.comments.length) {
      return;
    }
    await Promise.all(
      testCaseOrRun.comments.map(comment => this.removeAttachments(comment.attachments))
    );
  }

}
