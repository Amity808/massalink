import 'dotenv/config';
import {
    Account,
    SmartContract,
    JsonRpcProvider,
    Args,
    bytesToStr,
} from '@massalabs/massa-web3';

const CONTRACT_ADDR = 'AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk';

const provider = JsonRpcProvider.buildnet();
const contract = new SmartContract(provider, CONTRACT_ADDR);

const accountAddress =
    process.env.MY_ADDRESS ||
    (await Account.fromEnv()).address.toString();

console.log(`Fetching payment links for ${accountAddress}...`);

const args = new Args().addString(accountAddress);
const result = await contract.read('getMyLinks', args);
const linksStr = bytesToStr(result.value);

if (linksStr) {
    const linkIds = linksStr.split(',');
    console.log(`\n✅ You have ${linkIds.length} payment link(s):\n`);
    linkIds.forEach((linkId, index) => {
        console.log(`  ${index + 1}. Link ID: ${linkId}`);
    });
} else {
    console.log('❌ You have no payment links yet.');
    console.log('   Create one with: npm run createLink');
}

