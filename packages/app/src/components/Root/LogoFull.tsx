import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    height: 30,
  },
  text: {
    color: '#7df3e1',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  },
});

const LogoFull = () => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <span className={classes.text}>APIs Asíncrones</span>
    </div>
  );
};

export default LogoFull;
