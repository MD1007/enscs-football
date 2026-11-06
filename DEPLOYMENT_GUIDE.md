# 🌍 HOW TO HOST THE ENSCS FOOTBALL PLATFORM 24/7 (FREE & NO PC NEEDED)

This guide shows you how to put the platform online so that **all students at ENSCS can open the site on their phones anytime, anywhere (via 4G/5G, Mobilis, Djezzy, Ooredoo, or home Wi-Fi)**, without you needing to keep your computer turned on.

---

## 🏆 OPTION 1 (RECOMMENDED): DEPLOY TO RENDER (100% FREE, 5 MINUTES)

Render gives you a free 24/7 web server that runs Next.js and keeps your database saved.

### Step 1: Push your project to GitHub
1. Open your terminal in `D:\nscs champions`.
2. Initialize and push your code to your GitHub account:
```bash
git init
git add .
git commit -m "ENSCS Football Tournament platform"
git branch -M main
```
3. Create a new repository on [GitHub](https://github.com/new) named `enscs-football`.
4. Run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/enscs-football.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [https://render.com](https://render.com) and sign up for free using your GitHub account.
2. Click **New +** in the top right and select **Web Service**.
3. Select your `enscs-football` repository and click **Connect**.
4. Configure these simple settings:
   - **Name**: `enscs-champions` (or any name you like)
   - **Region**: Frankfurt (EU) (Closest and fastest for Algeria)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, click **Add Environment Variable**:
   - Key: `JWT_SECRET`
   - Value: `@mahdidhmn-enscs-secret-key-2026`
6. Click **Create Web Service**.

🎉 **Done!** Within 2 minutes, Render will give you a public link like:
👉 `https://enscs-champions.onrender.com`

You can send this link to your classmates on Telegram, WhatsApp, Messenger, or Facebook. They can open it on their phones anytime!

---

## ⚡ OPTION 2: DEPLOY TO VERCEL

Vercel is the official platform by the creators of Next.js. It is lightning-fast on mobile phones.

1. Go to [https://vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** and import `enscs-football`.
3. Add the environment variable:
   - `JWT_SECRET` = `@mahdidhmn-enscs-secret-key-2026`
4. Click **Deploy**.
5. You instantly get a clean link like:
   👉 `https://enscs-football.vercel.app`

*(Note: For permanent database persistence on Vercel across multiple weeks, connect Supabase by running `supabase_schema.sql` in Supabase SQL editor).*

---

## 📱 CREATING A SHORT LINK OR QR CODE FOR STUDENTS

Once you get your online link (e.g. `https://enscs-champions.onrender.com`):
1. **Shorten it**: Go to [tinyurl.com](https://tinyurl.com) and make a custom memorable link like:
   `tinyurl.com/enscs-foot`
2. **Make a QR Code**: Go to [qr-code-generator.com](https://www.qr-code-generator.com/) and paste your link. Print or post the QR code on the ENSCS school boards or in class group chats so students can just scan it with their phone cameras!

