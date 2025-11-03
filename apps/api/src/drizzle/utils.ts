import { decrypt as sharedDecrypt, encrypt as sharedEncrypt } from '@conar/shared/encryption'
import { customType } from 'drizzle-orm/pg-core'
import { env } from '~/env'

/**
 * Chiffre un texte avec un secret donné
 */
export function encrypt(text: string, secret: string): Promise<string> {
  return Promise.resolve(sharedEncrypt({ text, secret }))
}

/**
 * Déchiffre un texte chiffré avec un secret donné
 */
export function decrypt(encryptedText: string, secret: string): Promise<string | null> {
  return Promise.resolve(sharedDecrypt({ encryptedText, secret }))
}

export function encryptedJson<TData>(name?: string) {
  return customType<{ data: TData, driverData: string }>({
    dataType() {
      return 'text'
    },
    toDriver(value: TData) {
      return sharedEncrypt({ text: JSON.stringify(value), secret: env.ENCRYPTION_SECRET })
    },
    fromDriver(driverData: string): TData {
      return JSON.parse(sharedDecrypt({ encryptedText: driverData, secret: env.ENCRYPTION_SECRET })!)
    },
  })(name!)
}

export function encryptedText(name?: string) {
  return customType<{ data: string, driverData: string }>({
    dataType() {
      return 'text'
    },
    toDriver(value: string) {
      return sharedEncrypt({ text: value, secret: env.ENCRYPTION_SECRET })
    },
    fromDriver(driverData: string) {
      return sharedDecrypt({ encryptedText: driverData, secret: env.ENCRYPTION_SECRET })!
    },
  })(name!)
}
