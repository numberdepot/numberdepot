'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Link from 'next/link';

/**
 * Shown wherever an admin lands on a customer purchase flow.
 *
 * This is a courtesy, not the control — the API refuses these actions for admin
 * accounts regardless of what the UI renders. Its job is to explain why the
 * buttons are dead rather than leaving the admin poking at them.
 */
export default function AdminShoppingNotice({
  action = 'buy numbers or make offers',
  sx,
}: {
  action?: string;
  sx?: object;
}) {
  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ borderRadius: 2, ...sx }}
      action={
        <Button component={Link} href="/admin" size="small" color="inherit" sx={{ fontWeight: 700 }}>
          Admin Panel
        </Button>
      }
    >
      <AlertTitle sx={{ fontWeight: 700 }}>You&apos;re signed in as an admin</AlertTitle>
      Admin accounts cannot {action}. Sign in with a customer account to shop.
    </Alert>
  );
}
