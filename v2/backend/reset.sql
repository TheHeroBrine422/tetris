DROP TABLE users;
DROP TABLE revokedTokens;


CREATE TABLE users(
  ID TEXT PRIMARY KEY,
  EMAIL TEXT,
  ACCESS INT,
  USERNAME TEXT,
  PASSWORD_HASH TEXT
);

CREATE TABLE revokedTokens(
  TOKEN_HASH TEXT PRIMARY KEY
);

INSERT INTO users VALUES ('parkingdev@bentonvillek12.org', 3, 'DEVELOPER NOTAPERSON', 'ABC123');