import should from 'should';
import { register } from '../../../../../src/index';
import { KeyPair, TransactionBuilderFactory } from '../../../../../src/coin/cspr';
import * as testData from '../../../../resources/cspr/cspr';
import { TransactionType } from '../../../../../src/coin/baseCoin';
import { Transaction } from '../../../../../src/coin/cspr/transaction';

describe('CSPR Wallet initialization', () => {
  const factory = register('tcspr', TransactionBuilderFactory);

  const initSignedTxBuilder = () => {
    const txBuilder = initUnsignedTxBuilder();
    txBuilder.sign({ key: testData.ROOT_ACCOUNT.privateKey });
    return txBuilder;
  };

  const initUnsignedTxBuilder = () => {
    const txBuilder = factory.getWalletInitializationBuilder();
    txBuilder.fee(testData.FEE);
    txBuilder.owner(testData.ACCOUNT_1.publicKey);
    txBuilder.owner(testData.ACCOUNT_2.publicKey);
    txBuilder.owner(testData.ACCOUNT_3.publicKey);
    txBuilder.source({ address: testData.ROOT_ACCOUNT.publicKey });
    return txBuilder;
  };

  describe('should build ', () => {
    it('an init transaction', async () => {
      const txBuilder = initSignedTxBuilder();
      const tx = await txBuilder.build();
      const txJson = tx.toJson();
      should.deepEqual(txJson.fee, testData.FEE);
      should.deepEqual(tx.signature.length, 1);
      should.equal(txJson.from.toUpperCase(), testData.ROOT_ACCOUNT.publicKey);
      tx.type.should.equal(TransactionType.WalletInitialization);
    });

    it('an init transaction with external signature', async () => {
      const txBuilder = factory.getWalletInitializationBuilder();
      txBuilder.fee(testData.FEE);
      txBuilder.owner(testData.ACCOUNT_1.publicKey);
      txBuilder.owner(testData.ACCOUNT_2.publicKey);
      txBuilder.owner(testData.ACCOUNT_3.publicKey);
      txBuilder.source({ address: testData.ROOT_ACCOUNT.publicKey });
      txBuilder.signature(
        testData.EXTERNAL_SIGNATURE.signature,
        new KeyPair({ pub: testData.EXTERNAL_SIGNATURE.publicKey }),
      );

      const tx = await txBuilder.build();
      const txJson = tx.toJson();
      should.equal(txJson.from.toUpperCase(), testData.ROOT_ACCOUNT.publicKey);
    });

    it('an init transaction with external signature included twice', async () => {
      const txBuilder = factory.getWalletInitializationBuilder();
      txBuilder.fee(testData.FEE);
      txBuilder.owner(testData.ACCOUNT_1.publicKey);
      txBuilder.owner(testData.ACCOUNT_2.publicKey);
      txBuilder.owner(testData.ACCOUNT_3.publicKey);
      txBuilder.source({ address: testData.ROOT_ACCOUNT.publicKey });
      txBuilder.signature(
        testData.EXTERNAL_SIGNATURE.signature,
        new KeyPair({ pub: testData.EXTERNAL_SIGNATURE.publicKey }),
      );
      txBuilder.signature(
        testData.EXTERNAL_SIGNATURE.signature,
        new KeyPair({ pub: testData.EXTERNAL_SIGNATURE.publicKey }),
      );

      const tx = await txBuilder.build();
      const txJson = tx.toJson();
      should.equal(txJson.from.toUpperCase(), testData.ROOT_ACCOUNT.publicKey);
    });
  });

  describe('should fail to build', () => {
    const factory = register('tcspr', TransactionBuilderFactory);

    it('a transaction without fee', async () => {
      const txBuilder = factory.getWalletInitializationBuilder();
      txBuilder.owner(testData.ACCOUNT_1.publicKey);
      txBuilder.owner(testData.ACCOUNT_2.publicKey);
      txBuilder.owner(testData.ACCOUNT_3.publicKey);
      txBuilder.source({ address: testData.ROOT_ACCOUNT.publicKey });
      await txBuilder.build().should.be.rejectedWith(testData.INVALID_TRANSACTION_MISSING_FEE);
    });

    it('a wallet initialization the wrong number of owners', async () => {
      const txBuilder = factory.getWalletInitializationBuilder();
      txBuilder.fee(testData.FEE);
      txBuilder.owner(testData.ACCOUNT_1.publicKey);
      txBuilder.owner(testData.ACCOUNT_2.publicKey);
      txBuilder.source({ address: testData.ROOT_ACCOUNT.publicKey });
      await txBuilder.build().should.be.rejectedWith(testData.INVALID_NUMBER_OF_OWNERS_TWO_OF_THREE);

      should.throws(
        () => txBuilder.owner(testData.ACCOUNT_1.publicKey),
        'Repeated owner address: ' + testData.ACCOUNT_1.publicKey,
      );

      should.doesNotThrow(() => txBuilder.owner(testData.ACCOUNT_3.publicKey));
      should.throws(
        () => txBuilder.owner(testData.ACCOUNT_4.publicKey),
        'A maximum of 3 owners can be set for a multisig wallet',
      );

      const newTxBuilder = factory.getWalletInitializationBuilder();
      newTxBuilder.fee(testData.FEE);
      newTxBuilder.source({ address: testData.ROOT_ACCOUNT.publicKey });
      await newTxBuilder.build().should.be.rejectedWith(testData.INVALID_TRANSACTION_MISSING_OWNERS);
    });

    it('a transaction with invalid source', async () => {
      const factory = register('thbar', TransactionBuilderFactory);
      const txBuilder = factory.getWalletInitializationBuilder();
      txBuilder.fee(testData.FEE);
      txBuilder.owner(testData.ACCOUNT_1.publicKey);
      txBuilder.owner(testData.ACCOUNT_2.publicKey);
      txBuilder.owner(testData.ACCOUNT_3.publicKey);
      await txBuilder.build().should.be.rejectedWith(testData.INVALID_TRANSACTION_MISSING_SOURCE);
    });
  });

  describe('should validate', () => {
    const factory = register('tcspr', TransactionBuilderFactory);

    it('an address', async () => {
      const txBuilder = factory.getWalletInitializationBuilder();
      txBuilder.validateAddress({ address: testData.VALID_ADDRESS });
      should.throws(
        () => txBuilder.validateAddress({ address: testData.INVALID_ADDRESS }),
        'Invalid address ' + testData.INVALID_ADDRESS,
      );
    });

    it('value should be greater than zero', () => {
      const txBuilder = factory.getWalletInitializationBuilder();
      should.throws(() => txBuilder.fee({ gasLimit: '-10' }));
      should.doesNotThrow(() => txBuilder.fee({ gasLimit: '10' }));
    });

    it('a private key', () => {
      const txBuilder = factory.getWalletInitializationBuilder();
      should.throws(() => txBuilder.validateKey({ key: 'abc' }), 'Invalid key');
      should.doesNotThrow(() => txBuilder.validateKey({ key: testData.ACCOUNT_1.privateKey }));
    });

    it('a transaction to build', async () => {
      const txBuilder = factory.getWalletInitializationBuilder();
      should.throws(() => txBuilder.validateTransaction(), 'Invalid transaction: missing fee');
      txBuilder.fee(testData.FEE);
      should.throws(() => txBuilder.validateTransaction(), 'Invalid transaction: missing source');
      txBuilder.source({ address: testData.VALID_ADDRESS });
      should.throws(() => txBuilder.validateTransaction(), 'wrong number of owners -- required: 3, found: 0');
      txBuilder.owner(testData.ACCOUNT_1.publicKey);
      should.throws(() => txBuilder.validateTransaction(), 'wrong number of owners -- required: 3, found: 1');
      txBuilder.owner(testData.ACCOUNT_2.publicKey);
      should.throws(() => txBuilder.validateTransaction(), 'wrong number of owners -- required: 3, found: 2');
      txBuilder.owner(testData.ACCOUNT_3.publicKey);
      should.doesNotThrow(() => txBuilder.validateTransaction());
    });
  });
  describe('should build from', () => {
    describe('serialized transactions', () => {
      it('a non signed transfer transaction from serialized', async () => {
        const builder = initUnsignedTxBuilder();
        const tx = (await builder.build()) as Transaction;
        const txJson = tx.toJson();

        const builder2 = factory.getWalletInitializationBuilder();
        builder2.from(tx.toBroadcastFormat());
        const tx2 = (await builder2.build()) as Transaction;
        const tx2Json = tx2.toJson();

        should.deepEqual(tx2Json, txJson, 'from implementation from factory should recreate original transaction');
      });

      it('a signed transfer transaction from serialized', async () => {
        const builder = initUnsignedTxBuilder();
        builder.sign({ key: testData.ROOT_ACCOUNT.privateKey });
        const tx = (await builder.build()) as Transaction;
        const txJson = tx.toJson();

        const builder2 = factory.getWalletInitializationBuilder();
        builder2.from(tx.toBroadcastFormat());
        const tx2 = (await builder2.build()) as Transaction;
        const tx2Json = tx2.toJson();

        should.deepEqual(tx2Json, txJson, 'from implementation from factory should recreate original transaction');
        should.deepEqual(
          tx2.casperTx.approvals,
          tx.casperTx.approvals,
          'from implementation from factory should get approvals correctly',
        );
      });

      it('an offline multisig transfer transaction', async () => {
        const builder = initUnsignedTxBuilder();
        builder.sign({ key: testData.ROOT_ACCOUNT.privateKey });
        builder.sign({ key: testData.ACCOUNT_1.privateKey });
        const tx = (await builder.build()) as Transaction;
        const txJson = tx.toJson();

        const builder2 = factory.getWalletInitializationBuilder();
        builder2.from(tx.toBroadcastFormat());
        const tx2 = (await builder2.build()) as Transaction;
        const tx2Json = tx2.toJson();

        should.deepEqual(tx2Json, txJson, 'from implementation from factory should recreate original transaction');
        should.deepEqual(
          tx2.casperTx.approvals,
          tx.casperTx.approvals,
          'from implementation from factory should get approvals correctly',
        );
      });
    });
  });
});