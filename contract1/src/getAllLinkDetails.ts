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

console.log(`Fetching payment link details for ${accountAddress}...\n`);

const args = new Args().addString(accountAddress);
const result = await contract.read('getAllMyLinkDetails', args);
const detailsStr = bytesToStr(result.value);

if (detailsStr) {
    const links = detailsStr.split(',');
    console.log(`✅ You have ${links.length} payment link(s):\n`);

    links.forEach((link, index) => {
        const parts = link.split('|');
        const linkId = parts[0];
        const address = parts[1];
        const description = parts[2];
        const amount = parts[3];

        console.log(`  ${index + 1}. Link ID: ${linkId}`);
        console.log(`     Description: ${description}`);
        console.log(`     Amount: ${amount === '0' ? 'Any amount' : amount + ' nanoMAS'}`);
        console.log(`     Address: ${address}`);
        console.log('');
    });
} else {
    console.log('❌ You have no payment links yet.');
    console.log('   Create one with: npm run createLink');
}

