import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { isRecord, parseScannedReceipt } from '@/utils/meal/receiptScan'

// Vercel function limit; retries are disabled so the 30s request timeout is the true cap.
export const maxDuration = 60

// ~8MB of base64 ≈ 6MB image — far above the client's ~1600px downscale.
const MAX_BASE64_LENGTH = 8_000_000

type AllowedMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

function toAllowedMediaType(value: unknown): AllowedMediaType | null {
  if (
    value === 'image/jpeg' ||
    value === 'image/png' ||
    value === 'image/webp' ||
    value === 'image/gif'
  ) {
    return value
  }
  return null
}

const RECEIPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'tax', 'tip', 'gratuity', 'discount', 'total'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'price', 'quantity'],
        properties: {
          name: { type: 'string', description: 'Item name as printed on the receipt' },
          price: {
            type: 'number',
            description: 'Total price of this line in dollars (for all units)',
          },
          quantity: {
            type: 'integer',
            description: 'Quantity printed on this line; 1 when not printed',
          },
        },
      },
    },
    tax: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Tax in dollars, or null when not printed',
    },
    tip: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Tip in dollars, or null when not printed',
    },
    gratuity: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Automatic gratuity or service charge in dollars, or null',
    },
    discount: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Discount as a positive dollar amount, or null',
    },
    total: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Printed grand total in dollars, or null when unreadable',
    },
  },
}

const PROMPT = [
  'Extract the line items and charges from this restaurant receipt photo.',
  'Report each line item with its printed quantity and the total price for the line.',
  'When a line begins with a count (for example "2 Beer 13.00"), put that count in the quantity field and exclude it from the name.',
  'Do not include tax, tip, gratuity, service charges, or discounts as items —',
  'report those in their dedicated fields, in dollars, using null for anything',
  'not printed on the receipt. Report discounts as positive numbers.',
].join(' ')

const SCAN_FAILED = {
  error: "Couldn't read this receipt. Try another photo or enter items manually.",
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Receipt scanning is not configured on this server.' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const { image } = body
  const mediaType = toAllowedMediaType(body.mediaType)
  if (typeof image !== 'string' || image.length === 0 || !mediaType) {
    return NextResponse.json(
      { error: 'Expected a base64 image and a supported mediaType.' },
      { status: 400 }
    )
  }
  if (image.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: 'Image is too large.' }, { status: 400 })
  }

  const client = new Anthropic({ maxRetries: 0 })
  try {
    const response = await client.messages.create(
      {
        model: 'claude-haiku-4-5',
        max_tokens: 16000,
        output_config: { format: { type: 'json_schema', schema: RECEIPT_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: image },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      },
      { timeout: 30_000 }
    )

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(SCAN_FAILED, { status: 502 })
    }
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    )
    if (!textBlock) {
      return NextResponse.json(SCAN_FAILED, { status: 502 })
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(textBlock.text)
    } catch {
      return NextResponse.json(SCAN_FAILED, { status: 502 })
    }
    const scan = parseScannedReceipt(parsed)
    if (!scan) {
      return NextResponse.json(SCAN_FAILED, { status: 502 })
    }
    return NextResponse.json(scan)
  } catch (error) {
    console.error('scan-receipt failed:', error)
    return NextResponse.json(SCAN_FAILED, { status: 502 })
  }
}
