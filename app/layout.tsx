import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={
  title:'ProTracer | Find your perfect package',
  description:'A smarter way to design your ProTracer camera system. Compare hardware, service, storage and team plans with transparent pricing.',
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
