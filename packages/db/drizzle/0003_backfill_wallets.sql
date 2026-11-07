INSERT INTO member_wallets (league_id, user_id, booster_stock, booster_stock_at)
SELECT league_id, user_id, 2, now() FROM league_members
ON CONFLICT DO NOTHING;
