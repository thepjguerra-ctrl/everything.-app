# EVERYTHING.

A place to keep your day, your thoughts, and your projects in one spot. Plan Today in cards, keep notes and ideas under Thoughts, and give each project its own files, folders, and links.

## Opening it

Double-click `index.html`. It opens in your browser — no install. The first open needs internet: React, fonts, and icons load from the web. After that, it works offline.

## Your data

Everything you enter lives only in this browser, on this device. It is never uploaded or sent anywhere, which also means it won't follow you to another browser or computer. Clearing your browser data wipes it. Back up regularly from Settings → Your Data — Today shows a reminder if a week goes by without one. "Back up everything" includes project files; "Data only" is the small version.

## Making it yours

Open `index.html` in any text editor and search for these:

`const SECS` — the six sections on Today (Must Happen, Making, Life Admin, etc). Rename them, reorder them, swap the icons.

`const PRESETS` — the day modes (Balanced Day, Creative Day, Admin Day, Survival Day, Deep Work Day) that lay out the canvas when you click one. Change what each mode shows or how it's sized.

`const T` — the color palette. Every color in the app traces back to this one object.

`const EVERYTHING_QUOTES` — the line that appears at the top of Today, picked at random each time you open the app. Add your own, remove the ones you don't like.

`const MODULE_META` — the optional sections (Projects, Lists, Time Clock) people can switch on in Settings.

## What's in the folder

`index.html` is the whole app. `assets/` holds the logo and images it uses. `dev/` is working files and backups from building this — ignore it or delete it, the app doesn't need it to run.
