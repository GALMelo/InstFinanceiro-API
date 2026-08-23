import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

const VALID_KEY = 'a'.repeat(64); // 32 bytes em hex

const makeService = (key = VALID_KEY) =>
  new CryptoService({ getOrThrow: () => key } as unknown as ConfigService);

describe('CryptoService', () => {
  it('decripta para o plaintext original', () => {
    const svc = makeService();
    const plaintext = JSON.stringify({ cpf: '000.000.000-00', password: 'secreta' });
    expect(svc.decrypt(svc.encrypt(plaintext))).toBe(plaintext);
  });

  it('gera ciphertext diferente a cada chamada (IV aleatório)', () => {
    const svc = makeService();
    const enc1 = svc.encrypt('igual');
    const enc2 = svc.encrypt('igual');
    expect(enc1).not.toBe(enc2);
  });

  it('rejeita ENCRYPTION_KEY com comprimento errado', () => {
    expect(() => makeService('curta')).toThrow('ENCRYPTION_KEY');
  });

  it('lança erro ao decriptar dado adulterado (falha na autenticação GCM)', () => {
    const svc = makeService();
    const [iv, tag, enc] = svc.encrypt('dados').split(':');
    // inverte os últimos bytes do ciphertext para simular adulteração
    const tampered = enc.slice(0, -4) + 'ffff';
    expect(() => svc.decrypt(`${iv}:${tag}:${tampered}`)).toThrow();
  });

  it('o ciphertext tem o formato iv:authTag:ciphertext', () => {
    const parts = makeService().encrypt('x').split(':');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toHaveLength(24);  // 12 bytes → 24 hex chars
    expect(parts[1]).toHaveLength(32);  // 16 bytes → 32 hex chars
  });
});
