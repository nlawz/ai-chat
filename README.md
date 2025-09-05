<a href="https://exa-chatbot.vercel.app/">
  <img alt="Exa Powered AI Chatbot" src="app/(chat)/opengraph-image.png">
  <h1 align="center">Exa x Chat SDK</h1>
</a>

<p align="center">
    Exa-powered Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications — now with Exa Search, Research, and Websets integrations.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

-   [Exa Integrations](#exa-integrations)
    -   Search: Quick web results for timely context and links
    -   Research: In‑depth long‑form research with structured summaries and citations
    -   Websets: Company and people search that populates spreadsheet artifacts
-
-   [Next.js](https://nextjs.org) App Router
    -   Advanced routing for seamless navigation and performance
    -   React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
-   [AI SDK](https://sdk.vercel.ai/docs)
    -   Unified API for generating text, structured objects, and tool calls with LLMs
    -   Hooks for building dynamic chat and generative user interfaces
    -   Supports xAI (default), OpenAI, Fireworks, and other model providers
-   [shadcn/ui](https://ui.shadcn.com)
    -   Styling with [Tailwind CSS](https://tailwindcss.com)
    -   Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
-   Data Persistence
    -   [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
    -   [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
-   [Auth.js](https://authjs.dev)
    -   Simple and secure authentication

## Model Providers

This template uses the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to access multiple AI models through a unified interface. The default configuration includes [xAI](https://x.ai) models (`grok-2-vision-1212`, `grok-3-mini-beta`) routed through the gateway.

### AI Gateway Authentication

**For Vercel deployments**: Authentication is handled automatically via OIDC tokens.

**For non-Vercel deployments**: You need to provide an AI Gateway API key by setting the `AI_GATEWAY_API_KEY` environment variable in your `.env.local` file.

With the [AI SDK](https://ai-sdk.dev/docs/introduction), you can also switch to direct LLM providers like [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://ai-sdk.dev/providers/ai-sdk-providers) with just a few lines of code.

## Exa Integrations

-   **Exa Search**: Quick web results for timely context and links.
-   **Exa Research**: In‑depth research over long‑form text with structured summaries and citations.
-   **Exa Websets**: Company and people search that populates live spreadsheet artifacts.

### Setup: Exa API Key

To enable Exa features, add your Exa API key to the environment:

1. Visit the Exa Dashboard and log in: [dashboard.exa.ai/login](https://dashboard.exa.ai/login)
2. Create or copy an API key.
3. Add it to your `.env.local`:

```bash
# .env.local
EXA_API_KEY=your_exa_api_key_here
```

4. Restart the dev server. On Vercel, set `EXA_API_KEY` in Project Settings → Environment Variables.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI+Chatbot&demo-description=An+Open-Source+AI+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-kv%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).
