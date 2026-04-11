/**
 * Nominal/branded type helpers. These exist only in the type system — at runtime
 * a `UserId` is just a string.
 */

declare const brandTag: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brandTag]: B };

/**
 * Factory to create a branding helper for a specific brand.
 * Usage:
 *   const userId = brand<UserId>()('abc-123');
 */
export const brand =
  <B>() =>
  <T>(value: T): T & B =>
    value as T & B;

// ----- Common branded IDs -----

export type UserId = string & Brand<string, 'UserId'>;
export type CharacterId = string & Brand<string, 'CharacterId'>;
export type FortressId = string & Brand<string, 'FortressId'>;
export type CombatSessionId = string & Brand<string, 'CombatSessionId'>;
export type ItemDefId = string & Brand<string, 'ItemDefId'>;
export type ItemInstanceId = string & Brand<string, 'ItemInstanceId'>;
export type SectorId = string & Brand<string, 'SectorId'>;

export type TickNumber = number & Brand<number, 'TickNumber'>;
export type Seed = number & Brand<number, 'Seed'>;

// ----- Convenience constructors -----

export const toUserId = brand<UserId>();
export const toCharacterId = brand<CharacterId>();
export const toFortressId = brand<FortressId>();
export const toCombatSessionId = brand<CombatSessionId>();
export const toItemDefId = brand<ItemDefId>();
export const toItemInstanceId = brand<ItemInstanceId>();
export const toSectorId = brand<SectorId>();
export const toTickNumber = brand<TickNumber>();
export const toSeed = brand<Seed>();
