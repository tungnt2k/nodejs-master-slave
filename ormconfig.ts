const rootDir = 'src';

module.exports = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASS,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  logging: false,
  entities: [`${rootDir}/entities/index.{js,ts}`],
  migrations: [`${rootDir}/database/migrations/**/*.{js,ts}`],
  cli: {
    entitiesDir: `${rootDir}/entities`,
    migrationsDir: `${rootDir}/database/migrations`,
    seeds: ['src/database/seeds/**/*{.ts,.js}'],
    factories: ['src/database/factories/**/*{.ts,.js}'],
  },
};
