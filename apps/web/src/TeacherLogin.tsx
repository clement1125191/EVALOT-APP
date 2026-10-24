import {useState,useEffect,type ReactNode} from 'react';
import {api} from './api';
import './login.css';
export interface Teacher{id:string;displayName:string;email:string;}
export function TeacherAccess({children}:{children:(teacher:Teacher,onLogout:()=>void)=>ReactNode}){
  const [teacher,setTeacher]=useState<Teacher|null>(null);const [loading,setLoading]=useState(true);
  const [connectionError,setConnectionError]=useState('');const [signup,setSignup]=useState(false);
  const [visible,setVisible]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [recovery,setRecovery]=useState(false);const [notice,setNotice]=useState('');
  const [resetToken,setResetToken]=useState(()=>new URLSearchParams(location.search).get('reset')??'');
  const [providers,setProviders]=useState({google:false,recovery:false});
  const [password,setPassword]=useState('');const [remember,setRemember]=useState(false);
  async function check(){
    setLoading(true);setConnectionError('');
    try{const response=await fetch('/api/auth/me');if(response.status===401){setTeacher(null);return;}const result=await response.json();if(!response.ok)throw new Error('Unable to reach your teacher workspace.');setTeacher(result.teacher);}
    catch(e){setConnectionError(e instanceof Error ? e.message:'Unable to connect.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{
    void check();void api<{google:boolean;recovery:boolean}>('/auth/options').then(setProviders).catch(()=>{});
    const params=new URLSearchParams(location.search);const failure=params.get('authError');
    if(failure)setError(failure==='existing-account'?'This email already has an Evalot account. Sign in with its password, or reset your password.':'Google sign-in could not be completed. Please try again.');
    if(params.has('reset') || failure)history.replaceState(null,'',location.pathname);
    const expired=()=>{setTeacher(null);setPassword('');setError('Your session has ended. Please sign in again.');};
    window.addEventListener('evalot:session-expired',expired);return()=>window.removeEventListener('evalot:session-expired',expired);
  },[]);
  async function logout(){
    setBusy(true);try{await api('/auth/logout','POST');setTeacher(null);setPassword('');setSignup(false);setError('');}
    catch(e){window.alert(e instanceof Error ? e.message:'Unable to sign out.');}finally{setBusy(false);}
  }
  if(loading)return <div className="access-loading" role="status">Opening your teacher workspace…</div>;
  if(teacher && !resetToken)return <>{children(teacher,()=>{if(!busy)void logout();})}</>;
  return <div className="login-layout">
    <section className="login-story"><a className="login-brand" href="/">evalot<span>FOR TEACHERS</span></a><div className="story-content"><span className="story-tag">MORE TIME FOR WHAT MATTERS</span><h1>A little less marking.<br/>A lot more teaching.</h1><p>Your assessments, your marking guide, your final say. One focused workspace to help you move through a pile of papers with confidence.</p><div className="story-card"><div className="paper-stack"><span>Q1</span><div><i/><i/><i/></div><b>✓</b></div><div className="story-card-caption"><strong>Clarity from the first question.</strong><small>Set the guide. Review the work. Own the marks.</small></div></div></div><footer>Built around a teacher’s judgement.</footer></section>
    <section className="login-form-area"><div className="login-form-inner"><div className="login-topline">TEACHER WORKSPACE <span>● Private by account</span></div><h2>{resetToken?'Choose a new password.':recovery?'Forgot your password?':signup ? 'Your teaching workspace starts here.' : 'Welcome back.'}</h2><p className="login-subtitle">{resetToken?'Choose a password of at least 6 characters.':recovery?'We’ll email you a secure link to reset it.':signup ? 'Create your teacher account to get started with Evalot.' : 'Sign in to continue with your assessments.'}</p>
      {!recovery && !resetToken && <div className="login-tabs" aria-label="Account access"><button className={!signup?'chosen':''} disabled={busy} onClick={()=>{setSignup(false);setError('');setPassword('');setVisible(false);}}>Sign in</button><button className={signup?'chosen':''} disabled={busy} onClick={()=>{setSignup(true);setError('');setPassword('');setVisible(false);}}>Create account</button></div>}
      {connectionError && <div className="message error" role="alert">Cannot connect to Evalot. <button className="text-button" onClick={()=>void check()}>Try again</button></div>}{error && <div className="message error" role="alert">{error}</div>}
      {recovery && !providers.recovery && <p className="login-footnote">Email recovery will be available once Evalot’s email provider is connected.</p>}
      {notice && <div className="message" role="status">{notice}</div>}
      {!recovery && !resetToken && <><button type="button" className="google-signin" disabled={busy || Boolean(connectionError)} onClick={()=>{if(providers.google)location.assign('/api/auth/google');else setError('Google sign-in is awaiting the provider settings in Evalot.');}}><span aria-hidden="true">G</span> Continue with Google</button><div className="login-divider">or continue with email</div></>}
      <form onSubmit={async event=>{
        event.preventDefault();const values=new FormData(event.currentTarget);
        if((signup || resetToken) && password!==values.get('confirmPassword')){setError('Your passwords do not match.');return;}
        setBusy(true);setError('');
        try{if(recovery || resetToken){const result=await api<{message:string}>(resetToken?'/auth/reset-password':'/auth/forgot-password','POST',resetToken?{token:resetToken,password}:{email:values.get('email')});setNotice(result.message);if(resetToken){setResetToken('');setRecovery(false);setSignup(false);setPassword('');}return;}const body={email:values.get('email'),password,remember,...(signup ? {displayName:values.get('displayName')}:{})};const result=await api<{teacher:Teacher}>(signup ? '/auth/register':'/auth/login','POST',body);setTeacher(result.teacher);setPassword('');}
        catch(e){setError(e instanceof Error ? e.message:'Unable to sign in.');}finally{setBusy(false);}
      }}>
        <fieldset disabled={busy || Boolean(connectionError)} className="question-fieldset">
          {signup && !recovery && !resetToken && <label>Your name<input name="displayName" autoComplete="name" required minLength={2} maxLength={100} placeholder="How should we address you?"/></label>}
          {!resetToken && <label>Email address<input name="email" type="email" autoComplete="username" autoCapitalize="none" required maxLength={254} placeholder="you@example.com"/></label>}
          {!recovery && <label>Password<div className="password-input"><input aria-label="Password" name="password" type={visible?'text':'password'} autoComplete={(signup || resetToken)?'new-password':'current-password'} required minLength={(signup || resetToken)?6:1} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} placeholder={signup?'Choose a memorable passphrase':'Enter your password'}/><button type="button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?'Hide':'Show'}</button></div></label>}
          {(signup || resetToken) && !recovery && <><div className="password-hint"><span className={password.length>=6?'met':''}>{password.length>=6?'✓':'○'} At least 6 characters</span><small>A phrase is easier to remember. Spaces are welcome.</small></div><label>Confirm password<input name="confirmPassword" type={visible?'text':'password'} autoComplete="new-password" required minLength={6} maxLength={128} placeholder="Enter your password again"/></label></>}
          {!recovery && !resetToken && <><button className="forgot-password" type="button" onClick={()=>{setRecovery(true);setSignup(false);setPassword('');setError('');setNotice('');}}>Forgot password?</button><label className="remember-choice"><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)}/><span>Keep me signed in on this device<small>Leave this off on a shared school computer.</small></span></label></>}
          <button className="login-submit" disabled={busy}>{busy && (recovery || resetToken)?'Please wait…':resetToken?'Save new password →':recovery?'Send reset link →':busy ? (signup?'Creating your account…':'Signing you in…') : signup?'Create teacher account →':'Sign in to Evalot →'}</button>
        </fieldset>
      </form>{(recovery || resetToken) && <button className="back-signin" onClick={()=>{setRecovery(false);setResetToken('');setSignup(false);setPassword('');setError('');setNotice('');}}>← Back to sign in</button>}<p className="login-footnote">Your workspace is personal. You stay responsible for every final mark.</p></div><div className="login-bottom">Evalot · Made for the work teachers do.</div></section>
  </div>;
}
