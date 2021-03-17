# Random Employee Chats

Random Employee Chats was introduced by David Wragg and the idea is that two randomly selected engineers would meet in person in the office or schedule a 30-minute video call to discuss. You might learn a bit about their work and their team, but also get a new perspective on your own work. There's no fixed agenda, and nothing to prepare.

During the pandemic, direct colleagues or from different teams wouldn’t meet in the office anymore. Having Random Engineering Chats is a good way to keep in touch or meet new people.

Link to the [Blog post].

## Workers

- [UI]: Application UI
- [Pairing]: Worker Cron for pairing
- [Reminder]: Worker Cron for sending reminders

### Expected JS globals

- `FEEDBACK_FORM`: Link to a form for people to leave feedback
- `GCHAT_WEBHOOK`: Google chat webhook for notifications
- `URL`: application URL

## License

Licensed under the BSD-3-Clause license found in the LICENSE file or at https://opensource.org/licenses/BSD-3-Clause.

[UI]: src/workers/randengchat
[Pairing]: src/workers/cron-pair
[Reminder]: src/workers/cron-reminder
[Blog post]: https://blog.cloudflare.com/random-employee-chats-cloudflare/
