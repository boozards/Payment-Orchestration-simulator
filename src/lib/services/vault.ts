import crypto from 'crypto';
import { memoryStore } from '../store/memoryCache';

// Simulated KMS Key (In a real system, this would be fetched from AWS KMS)
const ENCRYPTION_KEY = crypto.scryptSync('orchestrator-secret-key-12345', 'salt', 32);
const IV_LENGTH = 16; // For AES, this is always 16

export interface CardDetails {
  number: string;
  expiry: string; // MM/YY
  cvv: string;
  holder: string;
}

export class TokenizationVault {
  /**
   * Encrypts sensitive credit card data (simulating KMS envelope encryption)
   */
  private static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Store IV along with ciphertext
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypts encrypted card data
   */
  private static decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() || '', 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  /**
   * Tokenizes card data: saves in memory cache vault under token reference
   */
  public static tokenize(card: CardDetails): { token: string; brand: string; maskedNumber: string } {
    const cleanNumber = card.number.replace(/\D/g, '');
    const brand = this.detectBrand(cleanNumber);
    const maskedNumber = `•••• •••• •••• ${cleanNumber.slice(-4)}`;
    
    // Generate a unique token
    const token = `tok_${brand.toLowerCase()}_${cleanNumber.slice(-4)}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Encrypt sensitive JSON payload
    const sensitivePayload = JSON.stringify({
      number: cleanNumber,
      expiry: card.expiry,
      cvv: card.cvv,
      holder: card.holder
    });
    
    const encryptedCard = this.encrypt(sensitivePayload);
    
    // Save to global simulation memory store
    memoryStore.saveCardToken(token, {
      token,
      brand,
      maskedNumber,
      holder: card.holder,
      encryptedCard
    });
    
    memoryStore.publishEvent('vault.tokenize', `Tokenized card ${maskedNumber} for holder ${card.holder}`, {
      token,
      brand,
      maskedNumber
    });
    
    return { token, brand, maskedNumber };
  }

  /**
   * Detokenizes: retrieves the decrypted card info for processing with payment provider
   */
  public static detokenize(token: string): CardDetails | undefined {
    const record = memoryStore.getCardToken(token);
    if (!record) return undefined;
    
    try {
      const decryptedJSON = this.decrypt(record.encryptedCard);
      return JSON.parse(decryptedJSON) as CardDetails;
    } catch (e) {
      console.error('Failed to detokenize:', e);
      return undefined;
    }
  }

  private static detectBrand(number: string): string {
    if (number.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(number)) return 'Mastercard';
    if (/^3[47]/.test(number)) return 'Amex';
    if (/^6(?:011|5)/.test(number)) return 'Discover';
    return 'Visa'; // default mock
  }
}
