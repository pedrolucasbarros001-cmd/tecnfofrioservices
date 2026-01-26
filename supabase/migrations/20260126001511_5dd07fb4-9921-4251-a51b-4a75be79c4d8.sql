-- Insert 'dono' role for the main admin user
INSERT INTO user_roles (user_id, role)
VALUES ('bd88debb-2254-4ca6-b01b-cc3c151ef3fc', 'dono')
ON CONFLICT DO NOTHING;