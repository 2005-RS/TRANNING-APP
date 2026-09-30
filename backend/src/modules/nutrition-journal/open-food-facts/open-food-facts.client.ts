import { Injectable, Logger } from '@nestjs/common';

export const OPEN_FOOD_FACTS_BASE_URL = 'https://world.openfoodfacts.org';
/** OFF asks every integration to identify itself. */
export const OPEN_FOOD_FACTS_USER_AGENT =
  'TrainingApp/1.0 (nutrition journal; https://github.com/2005-RS/TRANNING-APP)';
const TIMEOUT_MS = 8_000;
const FIELDS = [
  'code',
  'product_name',
  'product_name_es',
  'generic_name_es',
  'brands',
  'nutriments',
  'serving_quantity',
  'serving_size',
].join(',');

/** Raw subset of an OFF product we read. Values may be strings, numbers or absent. */
export interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  generic_name_es?: string;
  brands?: string;
  serving_quantity?: number | string;
  serving_size?: string;
  nutriments?: Record<string, unknown>;
}

export type OpenFoodFactsLookup =
  | { status: 'found'; product: OpenFoodFactsProduct }
  | { status: 'not_found' }
  | { status: 'unavailable' };

/** Thin, injectable HTTP client so tests never hit the network. */
@Injectable()
export class OpenFoodFactsClient {
  private readonly logger = new Logger(OpenFoodFactsClient.name);

  async lookupBarcode(barcode: string): Promise<OpenFoodFactsLookup> {
    const url = `${OPEN_FOOD_FACTS_BASE_URL}/api/v2/product/${encodeURIComponent(
      barcode,
    )}?fields=${FIELDS}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': OPEN_FOOD_FACTS_USER_AGENT,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      if (response.status === 404) {
        return { status: 'not_found' };
      }
      if (!response.ok) {
        this.logger.warn(
          JSON.stringify({
            event: 'off_lookup_failed',
            status: response.status,
          }),
        );
        return { status: 'unavailable' };
      }
      const body = (await response.json()) as {
        status?: number;
        product?: OpenFoodFactsProduct;
      };
      if (body.status !== 1 || !body.product) {
        return { status: 'not_found' };
      }
      return { status: 'found', product: body.product };
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'off_lookup_error',
          reason: error instanceof Error ? error.name : 'unknown',
        }),
      );
      return { status: 'unavailable' };
    } finally {
      clearTimeout(timer);
    }
  }
}
