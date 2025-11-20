# Payment Link System - Massa Smart Contract

A simple **multi-user** payment system that allows **anyone** to:
- Register with a unique name to receive payments
- Generate payment links to share with friends
- Receive MAS tokens through their name or payment links
- Withdraw received payments

**Multiple users can use this system simultaneously!** Each user has their own:
- Unique registered name
- Personal balance
- Payment links they create

## Setup

Prerequisites:

- You must add a `.env` file at the root of the repository with:
  - `WALLET_SECRET_KEY="wallet_secret_key"` (for transactions)
  - `JSON_RPC_URL_PUBLIC=<https://test.massa.net/api/v2:33035>`

## Quick Start

### 1. Build and Deploy

```shell
npm run build
npm run deploy
```

After deployment, copy the contract address and update it in the scripts below.

### 2. Check Name Availability (Optional)

Before registering, check if your desired name is available:

```shell
# Edit src/checkName.ts with the name you want
npm run checkName
```

### 3. Register Your Name

Edit `src/register.ts` to set your desired name, then:

```shell
npm run register
```

**Note:** Each user needs to register with a unique name. Multiple users can register and use the system at the same time! Users pay for their own storage costs (0.01 MAS included in the script).

### 4. Create a Payment Link

Edit `src/createLink.ts` to set description and amount, then:

```shell
npm run createLink
```

Share the returned link ID with friends! Storage costs (0.01 MAS) are automatically included.

### 5. Receive Payments

Friends can pay you in two ways:

**By Name:**
```shell
# Edit src/pay.ts with recipient name and amount
npm run pay
```

**By Payment Link:**
```shell
# Edit src/payByLink.ts with link ID and amount
npm run payByLink
```

### 6. View Your Payment Links

See all your payment link IDs:
```shell
npm run getMyLinks
```

See detailed information about all your links:
```shell
npm run getAllLinkDetails
```

### 7. Withdraw Your Payments

```shell
npm run withdraw
```

## Contract Functions

**User Registration:**
- `register(name)` - Register your unique name to receive payments
- `isNameAvailable(name)` - Check if a name is available

**Payment Links:**
- `createPaymentLink(description, amount)` - Create a shareable payment link
- `getPaymentLink(linkId)` - Get payment link details for a specific link
- `getMyLinks()` - Get all your payment link IDs
- `getAllMyLinkDetails(address?)` - Get all your payment link details (address optional, defaults to caller)

**Payments:**
- `payToName(name)` - Pay someone using their registered name (send MAS with call)
- `payToLink(linkId)` - Pay using a payment link ID (send MAS with call)

**Balance Management:**
- `getBalance()` - Check your current balance
- `withdraw()` - Withdraw all your received payments

**Lookup:**
- `getNameAddress(name)` - Get address for a registered name

## How It Works

1. **Multi-User Registration**: Any user can register a unique name linked to their wallet address. Multiple users can register simultaneously - each with their own unique name.
2. **Payment Links**: Each user can create their own payment links with descriptions that generate unique IDs
3. **Receiving Payments**: Payments are stored per user in the contract until withdrawn. Each user has their own separate balance.
4. **Withdrawal**: Each user can withdraw their own accumulated balance to their wallet

**Key Features:**
- ✅ **Multi-user support**: Unlimited users can register and use the system
- ✅ **Unique names**: Each name can only be registered once
- ✅ **Separate balances**: Each user has their own balance tracked by their address
- ✅ **Personal payment links**: Each user can create multiple payment links

All functions are simple and straightforward - no complex engineering required!

## Unit tests

The test framework documentation is available here: [as-pect docs](https://as-pect.gitbook.io/as-pect)

```shell
npm run test
```

## Format code

```shell
npm run fmt
```
