import React from 'react';
import { Card, CardContent, Typography, Box, SvgIconProps } from '@mui/material';
import { styled } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement<SvgIconProps>;
  color: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
}

interface ChangeIndicatorProps {
  ispositive: string;
}

const IconWrapper = styled(Box)<{ color: string }>(({ theme, color }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 56,
  height: 56,
  borderRadius: '50%',
  backgroundColor: color,
  color: theme.palette.common.white,
}));

const ChangeIndicator = styled(Typography)<ChangeIndicatorProps>(
  ({ theme, ispositive }) => ({
    color: ispositive === 'true' ? theme.palette.success.main : theme.palette.error.main,
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
  })
);

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, change }) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {change && (
              <ChangeIndicator ispositive={change.isPositive.toString()}>
                {change.isPositive ? '+' : ''}
                {change.value}%
              </ChangeIndicator>
            )}
          </Box>
          <IconWrapper color={color}>
            {React.cloneElement(icon, { fontSize: 'medium' })}
          </IconWrapper>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;