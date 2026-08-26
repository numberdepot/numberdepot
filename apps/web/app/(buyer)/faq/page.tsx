'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import HelpOutlineIcon from '@mui/icons-material/Help';
import { api } from '@/lib/api';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

const fallbackFaqs: FAQ[] = [
  {
    id: '1',
    question: 'How do I purchase a phone number?',
    answer: 'Browse our collection by visiting the Search page. Once you find a number you like, select a service plan (Park, Forward, Unlimited, or Business), add it to your cart, and complete the checkout process. Your number will be active within minutes.',
    category: 'Getting Started',
  },
  {
    id: '2',
    question: 'What is the difference between the plans?',
    answer: 'Park ($2.99/mo) reserves your number with voicemail. Forward ($6.99/mo) lets you forward calls to any phone. Unlimited ($19.99/mo) gives you full calling and SMS. Business ($9.99/mo) adds auto-attendant and call analytics.',
    category: 'Pricing',
  },
  {
    id: '3',
    question: 'Is there a setup fee?',
    answer: 'Yes, there is a one-time setup fee of $5.00 per number. This covers provisioning, configuration, and activation. There are no other hidden fees.',
    category: 'Pricing',
  },
  {
    id: '4',
    question: 'Can I port my number to another carrier?',
    answer: 'Yes, numbers marked as "Portable" can be transferred to another carrier. Contact our support team to initiate a port-out request. The process typically takes 7-10 business days.',
    category: 'Numbers',
  },
  {
    id: '5',
    question: 'What types of numbers do you offer?',
    answer: 'We offer local numbers (with specific area codes), toll-free numbers (800, 888, 877, etc.), and vanity numbers (numbers that spell words or have memorable patterns).',
    category: 'Numbers',
  },
  {
    id: '6',
    question: 'Can I change my plan later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time from your account dashboard. Changes take effect at the start of your next billing cycle.',
    category: 'Account',
  },
  {
    id: '7',
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel your subscription from the Subscriptions page in your account. After cancellation, your number will remain active until the end of the current billing period.',
    category: 'Account',
  },
  {
    id: '8',
    question: 'Do you offer refunds?',
    answer: 'We offer a 7-day money-back guarantee on number purchases. Setup fees are non-refundable. Monthly plan fees are prorated if you cancel mid-cycle.',
    category: 'Billing',
  },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    api.get<FAQ[]>('/content/faqs')
      .then((res) => setFaqs(res.data && res.data.length > 0 ? res.data : fallbackFaqs))
      .catch(() => setFaqs(fallbackFaqs))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', ...Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)))];

  const filtered = faqs.filter((faq) => {
    const matchesSearch =
      !search ||
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAccordionChange = (id: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? id : false);
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #002664 0%, #001a45 100%)',
          py: { xs: 6, md: 8 },
          textAlign: 'center',
          color: '#fff',
        }}
      >
        <Container maxWidth="md">
          <HelpOutlineIcon sx={{ fontSize: 48, color: '#E53935', mb: 2 }} />
          <Typography variant="h2" sx={{ mb: 2, fontSize: { xs: '1.75rem', md: '2.5rem' }, color: '#fff' }}>
            Frequently Asked Questions
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 400, opacity: 0.9, mb: 4, color: '#fff' }}>
            Find answers to common questions about NumberDepot
          </Typography>
          <TextField
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              maxWidth: 500,
              width: '100%',
              bgcolor: '#fff',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': { border: 'none' },
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Container>
      </Box>

      {/* FAQ Content */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
        {/* Category Chips */}
        {categories.length > 2 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                clickable
                onClick={() => setSelectedCategory(cat as string)}
                sx={{
                  fontWeight: 600,
                  bgcolor: selectedCategory === cat ? 'primary.main' : 'transparent',
                  color: selectedCategory === cat ? '#fff' : 'text.secondary',
                  border: selectedCategory === cat ? 'none' : '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: selectedCategory === cat ? 'primary.dark' : 'action.hover',
                  },
                }}
              />
            ))}
          </Box>
        )}

        {/* FAQ List */}
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Skeleton height={64} sx={{ borderRadius: 2 }} />
            </Box>
          ))
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <HelpOutlineIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              No matching questions found
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Try a different search term or browse all categories.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => { setSearch(''); setSelectedCategory('All'); }}
            >
              Show All FAQs
            </Button>
          </Box>
        ) : (
          filtered.map((faq) => (
            <Accordion
              key={faq.id}
              expanded={expanded === faq.id}
              onChange={handleAccordionChange(faq.id)}
              sx={{
                mb: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px !important',
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '&.Mui-expanded': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  px: 3,
                  '& .MuiAccordionSummary-content': { my: 2 },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                    {faq.question}
                  </Typography>
                  {faq.category && (
                    <Chip
                      label={faq.category}
                      size="small"
                      sx={{
                        bgcolor: '#4BA0A118',
                        color: '#4BA0A1',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Container>

      {/* Contact CTA */}
      <Box sx={{ bgcolor: 'background.paper', py: { xs: 6, md: 8 }, textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Box
            component="img"
            src="/images/elephant-03.png"
            alt="NumberDepot elephant"
            sx={{
              width: { xs: 100, md: 130 },
              height: 'auto',
              mx: 'auto',
              mb: 3,
              filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.12))',
            }}
          />
          <Typography variant="h4" sx={{ mb: 2 }}>
            Still have questions?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Our support team is here to help. Reach out and we will get back to you within 24 hours.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" color="primary" size="large" href="mailto:support@numberdepot.net">
              Contact Support
            </Button>
            <Button component={Link} href="/search" variant="outlined" size="large">
              Browse Numbers
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
