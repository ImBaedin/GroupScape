# @GroupScape/runelite-party-client

A TypeScript WebSocket client for interacting with the RuneLite party system using Protocol Buffers. This package enables web applications to join RuneLite parties, send and receive party data, and handle real-time party events.

## Installation

This package is part of the GroupScape monorepo and can be used by other packages via workspace protocol:

```json
{
  "dependencies": {
    "@GroupScape/runelite-party-client": "workspace:*"
  }
}
```

## Features

- Full TypeScript support with type-safe message definitions
- WebSocket connection management with automatic reconnection
- Protocol Buffer encoding/decoding for efficient binary communication
- Event-driven architecture for handling party events
- Configurable WebSocket URL (defaults to RuneLite's official endpoint)
- Passphrase-based party joining (matches RuneLite's SHA-256 implementation)
- Automatic member ID generation stored in client instance

## Quick Start

```typescript
import { RuneLitePartyClient, ConnectionState } from "@GroupScape/runelite-party-client";

// Create a client instance
const client = new RuneLitePartyClient();

// Set up event handlers
client.setCallbacks({
  onConnect: () => {
    console.log("Connected to RuneLite party server");
  },
  onUserJoin: (data) => {
    console.log(`User ${data.memberId} joined party ${data.partyId}`);
  },
  onUserPart: (data) => {
    console.log(`User ${data.memberId} left party ${data.partyId}`);
  },
  onPartyData: (data) => {
    console.log(`Received data from user ${data.memberId}:`, data.type);
    // Handle the party data
    const payload = new TextDecoder().decode(data.data);
    console.log("Data:", payload);
  },
  onError: (error) => {
    console.error("Error:", error);
  },
});

// Connect to the server
await client.connect();

// Join a party using a passphrase (member ID is auto-generated and stored)
const { partyId, memberId } = await client.joinWithPassphrase("my-party-passphrase");
console.log(`Joined party ${partyId} with member ID ${memberId}`);

// Send data to the party
const data = new TextEncoder().encode(JSON.stringify({ message: "Hello party!" }));
await client.sendData("chat", data);

// Leave the party
await client.leave();

// Disconnect
client.disconnect();
```

## API Reference

### RuneLitePartyClient

The main client class for interacting with the RuneLite party system.

#### Constructor

```typescript
new RuneLitePartyClient(wsUrl?: string)
```

Creates a new client instance.

- `wsUrl` (optional): WebSocket URL. Defaults to `https://api.runelite.net/ws2`. The URL will be automatically converted from HTTP/HTTPS to WS/WSS.

#### Methods

##### `connect(): Promise<void>`

Connects to the WebSocket server. Returns a promise that resolves when the connection is established.

```typescript
await client.connect();
```

##### `disconnect(): void`

Disconnects from the WebSocket server and cleans up resources.

```typescript
client.disconnect();
```

##### `join(partyId: bigint, memberId: bigint): Promise<void>`

Joins a party with the specified party ID and member ID.

- `partyId`: The party ID to join (64-bit integer)
- `memberId`: Your member ID (64-bit integer)

```typescript
await client.join(BigInt(123456789), BigInt(987654321));
```

##### `joinWithPassphrase(passphrase: string, memberId?: bigint): Promise<{ partyId: bigint; memberId: bigint }>`

Joins a party using a passphrase string. The passphrase is converted to a party ID using SHA-256 hashing (matching RuneLite's implementation), and a member ID is automatically generated if not provided.

- `passphrase`: The party passphrase string
- `memberId`: Optional member ID. If not provided and no member ID exists in the client instance, one will be automatically generated and stored in the client.

Returns an object with the calculated `partyId` and the `memberId` used.

```typescript
// Join with passphrase - member ID will be auto-generated and stored in client instance
const { partyId, memberId } = await client.joinWithPassphrase("my-party-passphrase");

// Join with passphrase and custom member ID
await client.joinWithPassphrase("my-party-passphrase", BigInt(987654321));
```

##### `leave(): Promise<void>`

Leaves the current party.

```typescript
await client.leave();
```

##### `sendData(type: string, data: Uint8Array): Promise<void>`

Sends data to the party.

- `type`: A string identifying the type of data
- `data`: The data to send as a Uint8Array

```typescript
const data = new TextEncoder().encode("Hello party!");
await client.sendData("message", data);
```

##### `isConnected(): boolean`

Checks if the client is currently connected to the server.

```typescript
if (client.isConnected()) {
  // Send messages
}
```

##### `getState(): ConnectionState`

Gets the current connection state.

```typescript
const state = client.getState();
console.log(state); // "connected" | "disconnecting" | "disconnected" | "connecting" | "error"
```

##### `getCurrentPartyId(): bigint | null`

Gets the current party ID if joined, or null if not joined.

##### `getCurrentMemberId(): bigint | null`

Gets the current member ID if joined, or null if not joined.

##### `setCallbacks(callbacks: PartyEventCallbacks): void`

Sets event callbacks for party events. Callbacks can be updated at any time.

#### Event Callbacks

```typescript
interface PartyEventCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onUserJoin?: (data: UserJoin) => void;
  onUserPart?: (data: UserPart) => void;
  onPartyData?: (data: PartyData) => void;
}
```

##### `onConnect?: () => void`

Called when the WebSocket connection is established.

##### `onDisconnect?: () => void`

Called when the WebSocket connection is closed.

##### `onError?: (error: Error) => void`

Called when an error occurs.

##### `onUserJoin?: (data: UserJoin) => void`

Called when a user joins the party.

```typescript
interface UserJoin {
  partyId: bigint;
  memberId: bigint;
}
```

##### `onUserPart?: (data: UserPart) => void`

Called when a user leaves the party.

```typescript
interface UserPart {
  partyId: bigint;
  memberId: bigint;
}
```

##### `onPartyData?: (data: PartyData) => void`

Called when party data is received from another member.

```typescript
interface PartyData {
  partyId: bigint;
  memberId: bigint;
  type: string;
  data: Uint8Array;
}
```

### ConnectionState Enum

```typescript
enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTING = "disconnecting",
  ERROR = "error",
}
```

### Constants

#### `DEFAULT_WEBSOCKET_URL`

The default WebSocket URL: `"https://api.runelite.net/ws2"`

## Type Definitions

All protobuf message types are exported for TypeScript usage:

```typescript
import type {
  Join,      // Client join message
  Part,      // Client leave message
  Data,      // Client data message
  C2S,       // Client-to-server wrapper
  UserJoin,  // Server user join notification
  UserPart,  // Server user leave notification
  PartyData, // Server party data notification
  S2C,       // Server-to-client wrapper
} from "@GroupScape/runelite-party-client";
```

## Advanced Usage

### Custom WebSocket URL

```typescript
const client = new RuneLitePartyClient("wss://custom-server.com/ws");
await client.connect();
```

### Error Handling

```typescript
client.setCallbacks({
  onError: (error) => {
    console.error("Connection error:", error);
    // Implement retry logic or notify user
  },
});

try {
  await client.connect();
} catch (error) {
  console.error("Failed to connect:", error);
}
```

### Reconnection

The client automatically attempts to reconnect when the connection is lost. It uses exponential backoff up to 5 attempts. The reconnection behavior can be monitored through the `onError` and `onDisconnect` callbacks.

### Sending JSON Data

```typescript
const jsonData = { playerName: "Player1", level: 99, location: "Lumbridge" };
const encoded = new TextEncoder().encode(JSON.stringify(jsonData));
await client.sendData("player-status", encoded);
```

### Receiving JSON Data

```typescript
client.setCallbacks({
  onPartyData: (data) => {
    if (data.type === "player-status") {
      const json = JSON.parse(new TextDecoder().decode(data.data));
      console.log("Player status:", json);
    }
  },
});
```

## Utility Functions

### `passphraseToId(passphrase: string): Promise<bigint>`

Converts a passphrase string to a party ID using SHA-256 hashing, matching RuneLite's Java implementation.

```typescript
import { passphraseToId } from "@GroupScape/runelite-party-client";

const partyId = await passphraseToId("my-party-passphrase");
console.log(partyId); // BigInt value
```

### `generateMemberId(): bigint`

Generates a unique member ID using crypto-secure random values.

```typescript
import { generateMemberId } from "@GroupScape/runelite-party-client";

const memberId = generateMemberId();
```

## Testing

A test script is included to quickly verify the client works. It connects to a party with the passphrase "groupscapetest" and logs all received events:

```bash
bun run test.ts
```

Or run it directly from the package directory:

```bash
cd packages/runelite-party-client
bun run test.ts
```

## Protocol Buffer Implementation

This package uses Protocol Buffers (protobuf) for efficient binary serialization, matching the Java protobuf implementation used by RuneLite. The message structure is identical to the RuneLite party protocol.

## License

ISC