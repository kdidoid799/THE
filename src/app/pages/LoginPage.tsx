import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button, TextField, Box, Typography, Paper, Alert, Tabs, Tab } from '@mui/material';

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0); // 0 for login, 1 for register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (activeTab === 0) {
        // Login
        await signIn(email, password);
      } else {
        // Register
        await signUp(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
      }}
    >
      <Paper
        sx={{
          padding: 4,
          width: '100%',
          maxWidth: 400,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom align="center">
          {activeTab === 0 ? '登录' : '注册'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 3 }}
          centered
        >
          <Tab label="登录" />
          <Tab label="注册" />
        </Tabs>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? '处理中...' : activeTab === 0 ? '登录' : '注册'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;