# AI Voice Assistant – Features (MVP)

## 1. WhatsApp Messaging ✅

- Voice → intent → open WhatsApp chat with prefilled message
- Contact resolution from device contacts
  E.g.
  Send Sahil a happy birthday text -> it understand your context, fetches contact & draft a birthday wish to Sahil

## 2. Email Draft ✅

- Generate subject + body via LLM
- Open Gmail with prefilled draft
  E.g.
  Draft email to wish Mohit Happy Birthday -> it drafts a sweet birthday wish in body + regards at end, subject & mail to (if email is found in contacts), opens gmail app & ready to send!
  Draft email for leave on 5th may as going for a family trip -> it writes a leave email with details & raeson, + regards at end, subject & mail to (if email is found in contacts), opens gmail app & ready to send!

## 3. Instagram Smart Post ✅

- Pick latest image from gallery
- Generate caption + hashtags
- Open Instagram via share sheet
  E.g.
  Post my recent picture on insta -> it picks your latest picture - generate captions & hashtag & give you options for feed / reels - you select one - it opens that in instagram (caption might not be visible there due to insta permissions - but its already copied on clipboard), so paste - it'll paste caption + hashtags & post.

## 4. AI Translation ✅

- Translate spoken or typed text
- Offline-first fallback (local SDK)
  E.g.
  What do we call in Italy for Excuse me, can you pass me that book -> it translates, displays & read it loud that in Italian we call it..
  Can you translate I'm going to school in Hindi -> it translates, displays & read it loud that in Hindi we call it..

## 5. Call Contact ✅

- Resolve contact → trigger phone call intent
  E.g.
  Call Ram -> Fetches contact & ringing Ram

## 6. Multi-step Execution ✅

- Parse compound commands
- Execute sequential actions with state

## 7. Events / Reminders ✅

- Create local reminder
- Trigger notification at scheduled time
  E.g.
  Remind me to drink water -> it'll notify every 4 hours to drink water for next 24 hours
  Set a reminder to wish Rohan Happy Birthday on 11th of May -> it creates event in your calendar app, you can view calendar & it notifies you on 11th may

## 8. Voice AI Chat ✅

- Ask questions → get AI response
- Optional TTS playback

## 9. Smart Gallery Search ✅

- Fetch images
- Filter via tags/keywords
  E.g.
  Show me photos from 24th of feb -> it opens gallery & redirect to 24th feb pictures

## 10. Custom Commands ✅

- User-defined command → mapped to action chain
- Stored locally
