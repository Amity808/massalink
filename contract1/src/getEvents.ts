import 'dotenv/config';
import { JsonRpcProvider } from '@massalabs/massa-web3';

const CONTRACT_ADDR = 'AS1iRAcZ97umpfGvgSn4x8xsusZf9yd2UwNZmkwbMWUaB4XhEvUk';

const provider = JsonRpcProvider.buildnet();

console.log(`Fetching latest events for ${CONTRACT_ADDR}...\n`);

const events = await provider.getEvents({
    smartContractAddress: CONTRACT_ADDR,
});

if (events.length === 0) {
    console.log('No events found.');
} else {
    for (const event of events) {
        console.log(
            `• Slot ${event.slot} | Caller ${event.callerAddress} | Data: ${event.data}`,
        );
    }
}

