import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClinicsModule } from './clinics/clinics.module';
import { PackagesModule } from './packages/packages.module';
import { BookingsModule } from './bookings/bookings.module';
import { FilesModule } from './files/files.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { LeadsModule } from './leads/leads.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
  isGlobal: true,
  // .env всегда из корня проекта (работает при запуске из любой директории)
  envFilePath: join(__dirname, '..', '..', '.env'),
}),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    ClinicsModule,
    PackagesModule,
    BookingsModule,
    FilesModule,
    WebhooksModule,
    LeadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
