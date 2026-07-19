# EVERYTHING.

A place to dump everything on your mind and let it sort itself into a day you can actually work from. Type or paste a mess of tasks, and it splits them into sections, calendar events, and projects for you.

## Opening it

Double-click `index.html`. It opens in your browser — no install. The first open needs internet: React, fonts, and icons load from the web. After that, it works offline.

## Your data

Everything you enter lives only in this browser, on this device. It is never uploaded or sent anywhere, which also means it won't follow you to another browser or computer. Clearing your browser data wipes it. Export a backup regularly from Settings → Your Data.

## Making it yours

Open `index.html` in any text editor and search for these:

`const SECS` — the six sections on Today (Must Happen, Making, Life Admin, etc). Rename them, reorder them, swap the icons.

`const PRESETS` — the day modes (Balanced Day, Creative Day, Admin Day, Survival Day, Deep Work Day) that lay out the canvas when you click one. Change what each mode shows or how it's sized.

`const T` — the color palette. Every color in the app traces back to this one object.

`const EVERYTHING_QUOTES` — the line that appears at the top of Today, picked at random each time you open the app. Add your own, remove the ones you don't like.

`function secForLabel` — the rules that decide which section a dumped item lands in, based on words like "text," "buy," or "pay." Adjust the word lists to match how you actually talk.

## What's in the folder

`index.html` is the whole app. `assets/` holds the logo and images it uses. `dev/` is working files and backups from building this — ignore it or delete it, the app doesn't need it to run.
