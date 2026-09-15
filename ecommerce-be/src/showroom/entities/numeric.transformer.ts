import { ValueTransformer } from 'typeorm';

/**
 * VND amounts are whole-dong integers, so they are stored as bigint. The pg
 * driver hands bigint back as a string; this keeps the entity surface numeric.
 */
export const bigintToNumber: ValueTransformer = {
  to: (value?: number | null) =>
    value === null || value === undefined ? value : Math.round(value),
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
