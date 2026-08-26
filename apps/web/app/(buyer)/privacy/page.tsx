import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

export default function PrivacyPage() {
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '80vh' }}>
      <Box sx={{ background: 'linear-gradient(135deg, #002664 0%, #001a45 100%)', py: 5, color: '#fff' }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontWeight: 800, textAlign: 'center' }}>
            Privacy Policy
          </Typography>
        </Container>
      </Box>
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Information We Collect</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              We collect information you provide directly, such as your name, email address, phone number, and payment details when you create an account or make a purchase. We also collect usage data including pages visited, features used, and device information.
            </Typography>

            <Typography variant="h6" sx={{ mb: 2 }}>How We Use Your Information</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              Your information is used to provide and improve our services, process transactions, send service-related communications, and prevent fraud. We do not sell your personal information to third parties.
            </Typography>

            <Typography variant="h6" sx={{ mb: 2 }}>Data Security</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              We implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your personal information. Payment processing is handled by Stripe and we never store your full credit card details.
            </Typography>

            <Typography variant="h6" sx={{ mb: 2 }}>Cookies</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              We use essential cookies for authentication and session management. Analytics cookies help us understand how users interact with our platform. You can control cookie preferences through your browser settings.
            </Typography>

            <Typography variant="h6" sx={{ mb: 2 }}>Your Rights</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              You have the right to access, update, or delete your personal data at any time through your account settings. You may also request a copy of all data we hold about you by contacting our support team.
            </Typography>

            <Typography variant="h6" sx={{ mb: 2 }}>Contact Us</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              If you have questions about this Privacy Policy, please contact us at support@numberdepot.net.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
