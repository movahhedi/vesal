# Vesal

A modern TypeScript/JavaScript client for the Armaghan Vesal SMS API.

[![npm version](https://img.shields.io/npm/v/vesal.svg)](https://www.npmjs.com/package/vesal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 Modern ESM/CommonJS support
- 📘 Full TypeScript support with type definitions
- 🔄 Promise-based API
- ✨ Simple and intuitive interface
- 🛡️ Built-in error handling
- 📱 Send SMS (one-to-many and many-to-many)
- 📊 Check message status
- 📥 Receive messages
- 👤 Account management

## Installation

```bash
npm install vesal
```

```bash
yarn add vesal
```

```bash
pnpm add vesal
```

## Quick Start

```typescript
import { Vesal } from 'vesal';

// Initialize the client
const client = new Vesal(
  'your-username',
  'your-password',
  'your-sender-number'
);

// Send a simple SMS
const result = await client.Send({
  recipients: '09123456789',
  messages: 'Hello, World!'
});

console.log(`Sent ${result.count.success} messages successfully`);
```

## API Reference

### Constructor

```typescript
new Vesal(username: string, password: string, from: string)
```

Creates a new Vesal client instance.

**Parameters:**
- `username` - Your Vesal API username
- `password` - Your Vesal API password
- `from` - Default sender number

**Example:**
```typescript
const client = new Vesal('myusername', 'mypassword', '50002710000000');
```

---

### Send()

```typescript
async Send({
  recipients,
  messages,
  from
}: {
  recipients: string | string[];
  messages: string | string[];
  from?: string | string[];
}): Promise<IVesalResponse_Send_WithCount>
```

Sends SMS messages to one or multiple recipients.

**Parameters:**
- `recipients` - Phone number(s) to send to (e.g., `'09123456789'` or `['09123456789', '09987654321']`)
- `messages` - Message content(s) to send
- `from` - (Optional) Sender number(s), defaults to the number set in constructor

**Return Value:**
```typescript
{
  references: (number | string)[],  // Reference IDs for sent messages
  count: {
    success: number,  // Number of successfully sent messages
    fail: number      // Number of failed messages
  },
  errorModel: {
    errorCode: number,
    timestamp: string | number | null
  }
}
```

#### Send Methods

**One-to-Many (Same message to multiple recipients):**
```typescript
await client.Send({
  recipients: ['09123456789', '09987654321'],
  messages: 'Hello everyone!'
});
```

**Many-to-Many (Different messages to different recipients):**
```typescript
await client.Send({
  recipients: ['09123456789', '09987654321'],
  messages: ['Hello John!', 'Hello Jane!']
});
```

**Single message with custom sender:**
```typescript
await client.Send({
  recipients: '09123456789',
  messages: 'Your verification code is 1234',
  from: '50002710000001'
});
```

---

### GetMessageStatus()

```typescript
async GetMessageStatus(referencesIds: number[]): Promise<IVesalResponse_MessageState>
```

Gets the delivery status of sent messages.

**Parameters:**
- `referencesIds` - Array of reference IDs returned from `Send()`

**Return Value:**
```typescript
{
  states: Array<{
    id: number,      // Reference ID
    state: number    // Status code (see Message States below)
  }>,
  errorModel: {
    errorCode: number,
    timestamp: string | number | null
  }
}
```

**Example:**
```typescript
const sendResult = await client.Send({
  recipients: '09123456789',
  messages: 'Test message'
});

// Wait a bit for delivery
await new Promise(resolve => setTimeout(resolve, 5000));

const statusResult = await client.GetMessageStatus(sendResult.references);
console.log(statusResult.states);
// Output: [{ id: 123456, state: 2 }]
```

---

### GetReceivedMessages()

```typescript
async GetReceivedMessages(): Promise<IVesalResponse_ReceivedMessages>
```

Retrieves all received messages.

**Return Value:**
```typescript
{
  messageModels: Array<{
    originator: string,    // Sender's phone number
    destination: string,   // Your receiving number
    content: string        // Message content
  }>,
  errorModel: {
    errorCode: number,
    timestamp: string | number | null
  }
}
```

**Example:**
```typescript
const received = await client.GetReceivedMessages();
received.messageModels.forEach(msg => {
  console.log(`From: ${msg.originator}`);
  console.log(`To: ${msg.destination}`);
  console.log(`Message: ${msg.content}`);
});
```

---

### GetReceivedMessagesCount()

```typescript
async GetReceivedMessagesCount(): Promise<IVesalResponse_ReceivedMessagesCount>
```

Gets the count of received messages.

**Return Value:**
```typescript
{
  count: number,
  errorModel: {
    errorCode: number,
    timestamp: string | number | null
  }
}
```

**Example:**
```typescript
const result = await client.GetReceivedMessagesCount();
console.log(`You have ${result.count} new messages`);
```

---

### GetUserInfo()

```typescript
async GetUserInfo(): Promise<IVesalResponse_UserInfo>
```

Retrieves user account information including credit balance, active numbers, and account status.

**Return Value:**
```typescript
{
  user: {
    credit: number,              // Account credit balance
    numbers: string[],           // Your sender numbers
    username: string,
    active: boolean,
    expirationDate: string,
    // ... other account details
  },
  errorModel: {
    errorCode: number,
    timestamp: string | number | null
  }
}
```

**Example:**
```typescript
const userInfo = await client.GetUserInfo();
console.log(`Credit: ${userInfo.user.credit}`);
console.log(`Active: ${userInfo.user.active}`);
console.log(`Numbers: ${userInfo.user.numbers.join(', ')}`);
console.log(`Expires: ${userInfo.user.expirationDate}`);
```

---

## Error Handling

The package includes a custom `VesalError` class for API errors:

```typescript
import { Vesal, VesalError } from 'vesal';

try {
  await client.Send({
    recipients: '09123456789',
    messages: 'Test'
  });
} catch (error) {
  if (error instanceof VesalError) {
    console.error(`Vesal Error ${error.status}: ${error.message}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Codes

| Code | Description (English) | توضیحات (فارسی) |
|------|----------------------|------------------|
| 0 | Success | عملیات با موفقیت انجام شد |
| -100 | Reference ID not found | refrenceId مورد نظر یافت نشد |
| -101 | Authentication failed | احراز هویت کاربر موفقیت آمیز نبود |
| -102 | Username not found | نام کاربری یافت نشد |
| -103 | Invalid originator number | شماره originator اشتباه یا در بازه شماره های کاربر نیست |
| -104 | Insufficient credit | اعتبار کم است |
| -105 | Invalid request format | فرمت درخواست اشتباه است |
| -107 | Invalid recipient number | شماره گیرنده پیامک اشتباه است |
| -109 | Account expired | تاریخ انقضای حساب کاربری فرارسیده است |
| -110 | IP not allowed | درخواست از ip مجاز کاربر ارسال نشده است |
| -111 | Number blacklisted | شماره گیرنده در بلک لیست قرار دارد |
| -112 | Account inactive | حساب مشتری فعال نیست |
| -119 | Access denied | کاربر به سرویس مورد نظر دسترسی ندارد |
| -120 | No valid recipients | پیام ارسال شده دارای هیچ شماره معتبری نیست |
| -137 | Forbidden content | پیام نباید حاوی کلمات غیرمجاز می باشد |

**Get error description:**
```typescript
import { GetStatusText } from 'vesal';

const errorMessage = GetStatusText(-104);
console.log(errorMessage); // "اعتبار کم است"
```

---

## Message States

After sending a message, you can check its delivery status:

| State | Description (English) | توضیحات (فارسی) |
|-------|----------------------|------------------|
| 0 | In queue | پیامک در صف ارسال قرار دارد |
| 1 | Sent to operator | ارسال شده |
| 2 | Delivered | پیامک به موبایل گیرنده تحویل شده است |
| 3 | Not delivered | پیامک به موبایل گیرنده تحویل نشده است |
| 4 | Unknown status | وضعیت نامشخص |
| 5 | Received by system | پیامک توسط وب سرویس به شرکت ارمغان راه طلایی رسیده است |
| 6 | Cancelled by operator | پیام از سمت اپراتور لغو شده است |
| 7 | Expired by operator | پیام از سمت اپراتور منقضی شده است |
| 8 | Rejected by operator | پیام از سمت اپراتور reject شده است |

**Access state descriptions:**
```typescript
import { messageStates } from 'vesal';

console.log(messageStates[2]); // "پیامک به موبایل گیرنده تحویل شده است"
```

---

## Complete Example

```typescript
import { Vesal, VesalError, messageStates } from 'vesal';

async function main() {
  // Initialize client
  const client = new Vesal(
    'your-username',
    'your-password',
    '50002710000000'
  );

  try {
    // Check account info
    const userInfo = await client.GetUserInfo();
    console.log(`Credit: ${userInfo.user.credit}`);
    console.log(`Active: ${userInfo.user.active}`);

    // Send SMS
    const sendResult = await client.Send({
      recipients: ['09123456789', '09987654321'],
      messages: 'Hello from Vesal!'
    });

    console.log(`Successfully sent: ${sendResult.count.success}`);
    console.log(`Failed: ${sendResult.count.fail}`);

    // Check status after a delay
    await new Promise(resolve => setTimeout(resolve, 10000));

    const validRefs = sendResult.references.filter(
      ref => typeof ref === 'number'
    ) as number[];

    if (validRefs.length > 0) {
      const status = await client.GetMessageStatus(validRefs);
      status.states.forEach(state => {
        console.log(
          `Message ${state.id}: ${messageStates[state.state]}`
        );
      });
    }

    // Check received messages
    const received = await client.GetReceivedMessages();
    console.log(`Received ${received.messageModels.length} messages`);

  } catch (error) {
    if (error instanceof VesalError) {
      console.error(`Error ${error.status}: ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
  }
}

main();
```

---

## TypeScript Support

The package includes full TypeScript definitions. All types are automatically available:

```typescript
import type {
  IVesalResponse_Send_WithCount,
  IVesalResponse_MessageState,
  IVesalResponse_ReceivedMessages,
  IVesalResponse_ReceivedMessagesCount,
  IVesalResponse_UserInfo
} from 'vesal';
```

You can also import the source TypeScript directly:
```typescript
import { Vesal } from 'vesal/ts';
```

---

## API Endpoint

The package connects to: `http://vesal.armaghan.net:8080/rest`

---

## License

MIT © [Shahab Movahhedi](https://shmovahhedi.com)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/movahhedi/vesal/issues)
- **Author**: [Shahab Movahhedi](https://shmovahhedi.com)
- **Email**: dev@shmovahhedi.com

---

## Links

- [npm Package](https://www.npmjs.com/package/vesal)
- [GitHub Repository](https://github.com/movahhedi/vesal)
- [Author's Website](https://shmovahhedi.com)
