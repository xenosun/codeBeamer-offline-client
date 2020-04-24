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

import {Result} from './result';

export class TestStep {
  actionPreview: string;
  actionMarkup: string;
  critical: boolean;
  expectedResultPreview: string;
  expectedResultMarkup: string;
  actualResultPreview: string;
  actualResultMarkup: string;
  result: Result;
  autoCopyExpectedResults: boolean;

  constructor(obj: any) {
    if (obj) {
      this.actionPreview = obj.actionPreview || '';
      this.actionMarkup = obj.actionMarkup || (obj.length >= 1 ? (obj[0] || '') : '');
      this.expectedResultPreview = obj.expectedResultPreview || '';
      this.expectedResultMarkup = obj.expectedResultMarkup || (obj.length >= 2 ? (obj[1] || '') : '');
      this.critical = obj.critical || (obj.length >= 3 ? (obj[2] || false) : false);
      this.actualResultPreview = obj.actualResultPreview || '';
      this.actualResultMarkup = obj.actualResultMarkup || (obj.length >= 4 ? (obj[3] || '') : '');
      this.result = obj.result || (obj.length >= 5 ? (obj[4] || null) : null);
      this.autoCopyExpectedResults = obj.autoCopyExpectedResults || false;
    }
  }
}
