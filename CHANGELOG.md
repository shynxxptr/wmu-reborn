# Changelog

## [1.8.0] - 2024-12-12
### Added
- **!testall Command**: Admin command untuk auto-test semua player commands dengan live progress (35+ commands)
- **Coinflip Animation**: Koin sekarang benar-benar "dilempar" dengan animasi bolak-balik HEAD/TAIL
- **Transfer Limit**: Batas transfer harian 100 Juta (reset otomatis tiap hari)

### Fixed
- **Jail Message Spam**: Pesan penjara sekarang cuma muncul saat coba command, bukan setiap chat
- **Alcohol Party**: Teman yang di-tag di `/mabok` sekarang benar-benar ikut mabuk & dapet efek
- **Kuku Bima**: Gak lagi nge-reset bonus work limit dari item lain
- **Cooldown Display**: Ganti dari Discord timestamp ke server-side calculation (lebih akurat)
- **All-in Bet Cap**: Safety net 10 Juta di semua gambling command

### Changed
- **Patch Note Auto**: Dihapus auto-display (spam reduction)
- **Work Limit Display**: Sekarang show eskul buff di status (`7/10 (Buff +5)`)
- **Alcohol Party UX**: Kirim public message (semua bisa lihat pesta miras)
- **Transfer Confirmation**: Show sisa limit harian

## [1.0.0] - 2025-12-10
### Added
- **Patchnote System**: Added `!patchnote` command to view updates.
- **Custom Role Logic**: Refactored role management.
- **Daily Missions**: Added daily missions system.
- **Crash Game History**: Added history tracking for Crash game.
- **Event System**: Implemented event system with dual wallets.
- **New Jobs**: Added `!ngerjainpr`, `!parkir`, `!jualanpulsa`, `!jagawarnet`, and `!mulung` (with item drops).
- **School Expansion**: Added `!tawuran` (Brawl) and `!eskul` (Clubs with Buffs).
- **Delinquent Features**: Added `!bolos` (Skip School) and `!contek` (Cheat on Exam).
- **Rebalance**:
    - **Gambling**: Max Bet 10jt, adjusted payouts for `!coinflip` (2x) and `!math`.
    - **Economy**: `!daily` increased to 15k, `!mulung` increased to 3k-8k.
- **New Kantin Menu**: Added Seblak Pedas, Nasi Kuning, and Kuku Bima.
- **New Warung Items**: Added Esse Berry, Pod Bekas (Gacha), and Cerutu Sultan.
