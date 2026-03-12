import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  text: {
    color: '#7df3e1',
    fontWeight: 700,
    fontSize: 14,
  },
});

const LogoIcon = () => {
  const classes = useStyles();
  return <span className={classes.text}>A~</span>;
};

export default LogoIcon;
