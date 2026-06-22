---
name: Chat file transfer
description: Chat file/image transfer is already implemented in the chat screen.
---

## The Rule
Do NOT re-implement chat file transfer. It is already done.

**Where:** `artifacts/crewpay/components/chat/chat-screen.tsx`
- `handleAttach` callback at line ~310
- Uses `ImagePicker` for images and `DocumentPicker` for documents
- Uploads via `uploadChatAttachment` from the chat service
- UI attach button at line ~1002 (`onPress={() => void handleAttach()}`)

**Why:** Feature was completed in a prior session. Verified via grep for `handleAttach`, `uploadChatAttachment`, `DocumentPicker`.
