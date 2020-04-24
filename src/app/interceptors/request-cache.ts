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

import {HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Platform} from '@ionic/angular';
import {StorageService} from '../services/storage.service';

@Injectable()
export class RequestCacheProvider implements RequestCache {

  cache = new Map<string, RequestCacheEntry>();

  constructor(private storageService: StorageService,
              private platform: Platform) {
    this.platform.ready().then(() => {
      this.storageService.getRequestCache().then(cache => {
        this.cache = cache;
      });
    });
  }

  get(req: HttpRequest<any>): HttpResponse<any> | undefined {
    const url = req.urlWithParams;
    const cached = this.cache.get(url);

    return cached ? new HttpResponse<any>({body: cached.responseBody}) : undefined;
  }

  put(req: HttpRequest<any>, response: HttpResponse<any>): void {
    const url = req.urlWithParams;

    let responseBody = response.body;
    if (response.body instanceof Blob) {
      responseBody = URL.createObjectURL(response.body);
    }
    const entry = {url, responseBody};
    this.cache.set(url, entry);

    this.storageService.saveRequestCache(this.cache).then();
  }

}

export interface RequestCacheEntry {
  url: string;
  responseBody: any;
}

export abstract class RequestCache {
  abstract get(req: HttpRequest<any>): HttpResponse<any> | undefined;

  abstract put(req: HttpRequest<any>, response: HttpResponse<any>): void
}
