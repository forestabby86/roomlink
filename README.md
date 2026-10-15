# RoomLink — Free Zoom meeting cards for WhatsApp

RoomLink replaces the **generic Zoom thumbnail** in shared chats with a personalized image that displays the room name, day(s), time, time zone, meeting ID, Zoom passcode and optional *additional* room password.

**Important:** You cannot edit the preview of `zoom.us` itself. RoomLink creates a **different URL** that WhatsApp previews with RoomLink's custom image. The recipient taps the preview, sees the meeting details, and taps **Join Zoom meeting**.

## What is included

- Responsive room creation website with live preview
- Dynamic social sharing HTML metadata (`og:image`, `og:title`, etc.)
- Server-rendered **PNG** image containing actual meeting details (1200 × 630)
- Join page with validated Zoom URL and one big Join button
- Meeting ID auto-detection from pasted Zoom link
- WhatsApp sharing and copy buttons
- No login, no cookies, no database, no ads, no analytics
- No paid API required

## Publish it free with Vercel

1. Create a free GitHub account (if you don't already have one) and make a new repository called `roomlink`.
2. Upload **the contents of this folder** to that repository, preserving the `api` folder.
3. At https://vercel.com/new, connect your GitHub account and select the `roomlink` repository.
4. Leave **Framework Preset** at `Other` and deploy. You don't need environment variables or a build command.
5. Open the resulting `https://your-project.vercel.app` URL, enter real room details, and click **Create my RoomLink**.
6. Tap **Copy**, paste it into WhatsApp, and wait for WhatsApp to load the preview before sending.

The Vercel Hobby tier is for personal, noncommercial use and has free usage limits. For a larger or commercial public service, review the hosting plan/terms and rate limits first.

## Run it locally

With Node.js 20 or newer:

```bash
npm install
npm start
```

Go to http://localhost:3000. Local previews and image routes work, but a public WhatsApp preview needs an internet-accessible HTTPS domain.

To test the decoding, Open Graph HTML, image generation, Zoom hostname validation, and PNG size:

```bash
npm test
```

## How the share links work

Room details are serialized into a base64url-encoded versioned array, then placed in a URL like:

`https://your-project.vercel.app/r/<encoded-room-details>`

When WhatsApp loads that URL, the server returns Open Graph metadata pointing to:

`https://your-project.vercel.app/og/<encoded-room-details>`

The `/og/` endpoint renders the room's unique PNG using Sharp. The room page serves the actual Zoom link behind the Join button.

**Privacy:** Base64url is **not encryption**. Anyone with the link can decode all of its fields. Don't put private or confidential passcodes in RoomLink. Room details are part of the URL and may be captured in browser history, platform logs, message forwarding, and link-preview caches. The tool asks for explicit permission before creating a link. RoomLink does not persist a copy of the data itself.

**Changing details:** There is no database, so editing room information creates a new URL. The old one still shows the old information. You cannot remotely revoke an individual generated RoomLink in this version. Rotate the Zoom passcode if an old link needs to stop working.

**Time zones:** Times are displayed in the meeting's specified time zone. They are *not* automatically converted into each viewer's local time. `ET` and `CT` intentionally avoid ambiguous fixed `EST`/`CST` labels during daylight-saving changes.

**WhatsApp note:** WhatsApp ultimately controls how link previews are rendered or cached. A preview can be missing, cropped, or stale depending on the device/app and cache; no website can guarantee the exact appearance every time.

## Next improvements

- Easy-to-remember short links (would need server-side storage)
- Editable rooms with administrator access
- Schedule-aware cards and multi-meeting directories
- Automatic local time conversion and recurring calendar links
- Distinct themes and logos for meeting groups
- Hide passcodes in the public image for closed meetings

## License

MIT — use and modify this project freely. The service isn't affiliated with Zoom or WhatsApp.
