# Frontend Take-Home: Teach Me

Build a small interactive tutorial that teaches us something you know well. Choose a topic you have unique or extensive knowledge of. It can be professional, personal, serious, or fun.

For example, if you’re an experienced horseback rider, you might teach the steps involved in approaching a jump. If you’re a chef, you might teach someone how to chop an onion. Choose something that lets you demonstrate how you think about teaching and interaction, rather than simply displaying an article.

## Time Limit

Spend **no more than 4 hours total**, including planning, building, and documenting your work. You don’t need to use all four hours. We’d rather see a focused, polished experience than a broad, unfinished one.

## Requirements

Your tutorial should:

- Guide a learner through a sequence of steps or concepts.
- Include at least one meaningful interaction beyond navigating between steps. For example, a learner might make a choice, practice a skill, answer a question, or receive feedback based on an action.
- Make it clear where the learner is and what to do next.
- Work well on a recent desktop browser and a smaller screen.
- Be either hosted at a publicly accessible URL **or** straightforward to run locally with documented setup instructions.

A backend, database, authentication, and production infrastructure are **not required**. It’s fine to use mock or local data.

## Starter Project

The provided starter is a Next.js app using TypeScript, App Router, Tailwind CSS, and ESLint. You may add libraries or adapt the starter as needed.

### Local Development

Use Node.js 22 LTS or newer. From the `teach-me-candidate` directory, run:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can start editing `src/app/page.tsx`; the shared layout and styles are in `src/app/layout.tsx` and `src/app/globals.css`.

No environment variables are required for the starter. Its `next/font/google` configuration for Geist requires network access during the build.

### Checks and Production Build

```bash
npm run lint
npm run build
npm start
```

### Optional Deployment to Vercel

1. Import your Git repository into [Vercel](https://vercel.com/new).
2. Set the **Root Directory** to `./`.
3. Use the automatically detected **Next.js** framework preset and default build settings.
4. Deploy.

Alternatively, run `npx vercel` from the starter directory and follow the prompts to create a preview deployment. Use `npx vercel --prod` for production. Hosting is optional if your app is easy to run locally.

## AI and Other Tools

You may use AI tools, documentation, and third-party libraries. Briefly tell us what you used and how. Be prepared to explain your implementation and the decisions you made.

## What to Submit

Please provide:

1. A link to your source code and, if hosted, the live app.
2. A short README with setup and run instructions, approximate time spent, and any significant tools or libraries used.
3. A few notes on the tradeoffs you made, what you would improve with more time, and any known limitations.

## What We’ll Look For

We’ll discuss your work with you. We’re interested in the quality of the learning experience and interaction, thoughtful frontend implementation, usability and accessibility, and how you prioritize and explain tradeoffs within a limited time. We’re not judging the topic you choose or expecting a production-ready application.
