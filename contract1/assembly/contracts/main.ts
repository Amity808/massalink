import {
  Context,
  generateEvent,
  Storage,
  transferCoins,
  transferredCoins,
  Address,
} from '@massalabs/massa-as-sdk';
import { Args, stringToBytes } from '@massalabs/as-types';

const NAME_TO_ADDRESS_PREFIX = 'name_to_addr:';
const PAYMENT_LINK_PREFIX = 'payment_link:';
const USER_BALANCE_PREFIX = 'balance:';
const USER_LINKS_PREFIX = 'user_links:';
const LINK_COUNTER_KEY = 'link_counter';

export function constructor(_: StaticArray<u8>): void {
  assert(Context.isDeployingContract());
  Storage.set(LINK_COUNTER_KEY, '0');
  generateEvent('PaymentLink contract deployed');
}

export function register(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('Name is required');
  const userAddress = Context.transactionCreator().toString();

  const nameKey = NAME_TO_ADDRESS_PREFIX + name;
  assert(!Storage.has(nameKey), 'Name already taken');

  Storage.set(nameKey, userAddress);

  generateEvent(`User ${name} registered with address ${userAddress}`);
}

export function createPaymentLink(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const description = args.nextString().expect('Description is required');
  const amount = args.nextU64().expect('Amount is required (use 0 for any amount)');

  const userAddress = Context.transactionCreator().toString();
  const counterStr = Storage.get(LINK_COUNTER_KEY);
  const counter = I32.parseInt(counterStr);
  const linkId = counter.toString();
  Storage.set(LINK_COUNTER_KEY, (counter + 1).toString());

  const linkData = `${userAddress}|${description}|${amount.toString()}`;
  Storage.set(PAYMENT_LINK_PREFIX + linkId, linkData);

  const userLinksKey = USER_LINKS_PREFIX + userAddress;
  if (Storage.has(userLinksKey)) {
    const existingLinks = Storage.get(userLinksKey);
    Storage.set(userLinksKey, existingLinks + ',' + linkId);
  } else {
    Storage.set(userLinksKey, linkId);
  }

  generateEvent(
    `Payment link ${linkId} created by ${userAddress} for ${description}`,
  );
  return stringToBytes(linkId);
}

export function payToName(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('Name is required');
  const amount = transferredCoins();
  assert(amount > 0, 'No MAS tokens sent');

  const nameKey = NAME_TO_ADDRESS_PREFIX + name;
  assert(Storage.has(nameKey), 'Name not registered');

  const recipientAddress = Storage.get(nameKey);
  const balanceKey = USER_BALANCE_PREFIX + recipientAddress;
  const currentBalance = Storage.has(balanceKey)
    ? I64.parseInt(Storage.get(balanceKey))
    : 0;
  Storage.set(balanceKey, (currentBalance + amount).toString());

  generateEvent(`Payment of ${amount.toString()} MAS sent to ${name} (${recipientAddress})`);
}

export function payToLink(binaryArgs: StaticArray<u8>): void {
  const args = new Args(binaryArgs);
  const linkId = args.nextString().expect('Link ID is required');
  const amount = transferredCoins();
  assert(amount > 0, 'No MAS tokens sent');

  const linkKey = PAYMENT_LINK_PREFIX + linkId;
  assert(Storage.has(linkKey), 'Payment link not found');

  const linkData = Storage.get(linkKey);
  const parts = linkData.split('|');
  const recipientAddress = parts[0];
  const description = parts[1];

  const balanceKey = USER_BALANCE_PREFIX + recipientAddress;
  const currentBalance = Storage.has(balanceKey)
    ? I64.parseInt(Storage.get(balanceKey))
    : 0;
  Storage.set(balanceKey, (currentBalance + amount).toString());

  generateEvent(`Payment of ${amount.toString()} MAS sent via link ${linkId} (${description})`);
}

export function getPaymentLink(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const linkId = args.nextString().expect('Link ID is required');

  const linkKey = PAYMENT_LINK_PREFIX + linkId;
  assert(Storage.has(linkKey), 'Payment link not found');

  const linkData = Storage.get(linkKey);
  return stringToBytes(linkData);
}

export function withdraw(_: StaticArray<u8>): void {
  const caller = Context.transactionCreator().toString();
  const balanceKey = USER_BALANCE_PREFIX + caller;
  assert(Storage.has(balanceKey), 'No balance to withdraw');

  const balance = I64.parseInt(Storage.get(balanceKey));
  assert(balance > 0, 'Balance is zero');

  Storage.set(balanceKey, '0');
  transferCoins(new Address(caller), balance);

  generateEvent(`Withdrawn ${balance.toString()} MAS to ${caller}`);
}

export function getBalance(_: StaticArray<u8>): StaticArray<u8> {
  const caller = Context.transactionCreator().toString();
  const balanceKey = USER_BALANCE_PREFIX + caller;
  const balance = Storage.has(balanceKey) ? Storage.get(balanceKey) : '0';
  return stringToBytes(balance);
}

export function getNameAddress(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('Name is required');

  const nameKey = NAME_TO_ADDRESS_PREFIX + name;
  assert(Storage.has(nameKey), 'Name not registered');

  const address = Storage.get(nameKey);
  return stringToBytes(address);
}

export function isNameAvailable(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  const args = new Args(binaryArgs);
  const name = args.nextString().expect('Name is required');

  const nameKey = NAME_TO_ADDRESS_PREFIX + name;
  const available = !Storage.has(nameKey);
  return stringToBytes(available ? 'true' : 'false');
}


export function getMyLinks(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  let userAddress: string;

  if (binaryArgs.length > 0) {
    const args = new Args(binaryArgs);
    userAddress = args.nextString().expect('Address is required');
  } else {
    userAddress = Context.transactionCreator().toString();
  }

  const userLinksKey = USER_LINKS_PREFIX + userAddress;

  if (Storage.has(userLinksKey)) {
    const links = Storage.get(userLinksKey);
    return stringToBytes(links);
  }
  return stringToBytes('');
}

export function getAllMyLinkDetails(binaryArgs: StaticArray<u8>): StaticArray<u8> {
  let userAddress: string;

  if (binaryArgs.length > 0) {
    const args = new Args(binaryArgs);
    userAddress = args.nextString().expect('Address is required');
  } else {
    userAddress = Context.transactionCreator().toString();
  }

  const userLinksKey = USER_LINKS_PREFIX + userAddress;

  if (!Storage.has(userLinksKey)) {
    return stringToBytes('');
  }

  const linkIdsStr = Storage.get(userLinksKey);
  if (linkIdsStr.length == 0) {
    return stringToBytes('');
  }

  const linkIds = linkIdsStr.split(',');
  let result = '';

  for (let i = 0; i < linkIds.length; i++) {
    const linkId = linkIds[i];
    const linkKey = PAYMENT_LINK_PREFIX + linkId;

    if (Storage.has(linkKey)) {
      const linkData = Storage.get(linkKey);
      if (result.length > 0) {
        result += ',';
      }
      result += linkId + '|' + linkData;
    }
  }

  return stringToBytes(result);
}
