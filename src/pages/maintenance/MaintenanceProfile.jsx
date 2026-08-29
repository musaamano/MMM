import { useState, useEffect, useRef } from 'react';
import './maintenance.css';
import './MaintenanceProfile.css';

const BASE = `http://${window.location.hostname}:5000/api`;
const token = () => localStorage.getItem('token');

export default function MaintenanceProfile() {
  const [tab, setTab]       = useState('info');
  const [data, setData]     = useState({ name:'', email:'', phone:'', department:'', employeeId:'', username:'', role:'', createdAt:'', profilePhoto:null });
  const [pwd, setPwd]       = useState({ current:'', newPwd:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast]   = useState(null);
  const fileRef = useRef();

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    const t = token(); if (!t) return;
    fetch(`${BASE}/users/me`, { headers:{ Authorization:`Bearer ${t}` } })
      .then(r=>r.json())
      .then(u => setData(p => ({ ...p, ...u, profilePhoto: u.profilePhoto||null })))
      .catch(console.error);
  }, []);

  const initials = data.name
    ? data.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
    : 'MO';

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 5*1024*1024) { showToast('Max 5MB','error'); return; }
    setUploading(true);
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const MAX=400; let {width,height}=img;
      if(width>height){if(width>MAX){height=height*MAX/width;width=MAX;}}else{if(height>MAX){width=width*MAX/height;height=MAX;}}
      canvas.width=width; canvas.height=height;
      canvas.getContext('2d').drawImage(img,0,0,width,height);
      URL.revokeObjectURL(url);
      const b64 = canvas.toDataURL('image/jpeg',0.8);
      try {
        const res = await fetch(`${BASE}/users/profile`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify({profilePhoto:b64})});
        const d = await res.json(); if(!res.ok) throw new Error(d.message);
        setData(p=>({...p,profilePhoto:b64}));
        // Keep cached user in sync so header/avatar can reflect latest photo
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...stored, profilePhoto: b64 }));
        } catch {}
        // Notify layout components for instant avatar refresh
        window.dispatchEvent(new CustomEvent('maintenanceProfilePhotoUpdated', { detail: { profilePhoto: b64 } }));
        showToast('Photo updated!');
      } catch(err){ showToast(err.message||'Failed','error'); }
      finally { setUploading(false); }
    }; img.src=url;
  };

  const saveInfo = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`${BASE}/users/profile`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify({name:data.name,email:data.email,phone:data.phone})});
      const d = await res.json(); if(!res.ok) throw new Error(d.message);
      showToast('Profile saved!');
    } catch(err){ showToast(err.message||'Failed','error'); }
    finally { setSaving(false); }
  };

  const savePwd = async (e) => {
    e.preventDefault();
    if(pwd.newPwd!==pwd.confirm){showToast('Passwords do not match','error');return;}
    if(pwd.newPwd.length<8){showToast('Min 8 characters','error');return;}
    setSaving(true);
    try {
      const res = await fetch(`${BASE}/users/me/change-password`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`},body:JSON.stringify({currentPassword:pwd.current,newPassword:pwd.newPwd})});
      const d = await res.json(); if(!res.ok) throw new Error(d.message);
      showToast('Password changed!'); setPwd({current:'',newPwd:'',confirm:''});
    } catch(err){ showToast(err.message||'Failed','error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="maint-page" style={{ maxWidth:900 }}>
      {toast && <div className={`maint-toast ${toast.type}`}>{toast.msg}</div>}
      <div className="maint-page-header"><h2>My Profile</h2><p>Manage your account information</p></div>

      <div className="mp-container">
        {/* Header */}
        <div className="mp-header">
          <div className="mp-avatar-wrap">
            <div className="mp-avatar" onClick={() => fileRef.current.click()} title="Click to change">
              {data.profilePhoto ? <img src={data.profilePhoto} alt="avatar" /> : <span>{initials}</span>}
              <div className="mp-avatar-overlay">{uploading?'⏳':'📷'}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{display:'none'}} />
            <button className="mp-photo-btn" onClick={() => fileRef.current.click()} disabled={uploading}>
              {uploading?'Uploading...':'Change Photo'}
            </button>
            <small style={{color:'#9ca3af',fontSize:11}}>Max 5MB</small>
          </div>

          <div className="mp-header-info">
            <div className="mp-name-row">
              <h2>{data.name||'—'}</h2>
              <span className="mp-role-badge">MAINTENANCE OFFICER</span>
            </div>
            <div className="mp-info-grid">
              {[
                ['Username',    `@${data.username||'—'}`],
                ['Email',       data.email||'—'],
                ['Phone',       data.phone||'—'],
                ['Department',  data.department||'—'],
                ['Employee ID', data.employeeId||'—'],
                ['Member Since',data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : '—'],
              ].map(([l,v]) => (
                <div key={l} className="mp-info-item">
                  <span className="mp-info-label">{l}</span>
                  <span className="mp-info-value">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mp-tabs">
          <button className={`mp-tab ${tab==='info'?'active':''}`} onClick={()=>setTab('info')}>Personal Info</button>
          <button className={`mp-tab ${tab==='pwd'?'active':''}`} onClick={()=>setTab('pwd')}>Change Password</button>
        </div>

        {tab==='info' && (
          <form onSubmit={saveInfo} className="mp-form">
            <div className="maint-form-row">
              <div className="maint-form-group"><label>Full Name</label><input value={data.name} onChange={e=>setData(p=>({...p,name:e.target.value}))} required /></div>
              <div className="maint-form-group"><label>Email</label><input type="email" value={data.email} onChange={e=>setData(p=>({...p,email:e.target.value}))} required /></div>
            </div>
            <div className="maint-form-row">
              <div className="maint-form-group"><label>Phone</label><input value={data.phone||''} onChange={e=>setData(p=>({...p,phone:e.target.value}))} /></div>
              <div className="maint-form-group"><label>Department</label><input value={data.department||''} disabled /></div>
            </div>
            <button type="submit" className="maint-btn primary" disabled={saving}>{saving?'Saving...':'Save Changes'}</button>
          </form>
        )}

        {tab==='pwd' && (
          <form onSubmit={savePwd} className="mp-form">
            <div className="maint-form-group"><label>Current Password</label><input type="password" value={pwd.current} onChange={e=>setPwd(p=>({...p,current:e.target.value}))} required /></div>
            <div className="maint-form-row">
              <div className="maint-form-group"><label>New Password</label><input type="password" value={pwd.newPwd} onChange={e=>setPwd(p=>({...p,newPwd:e.target.value}))} required /></div>
              <div className="maint-form-group"><label>Confirm Password</label><input type="password" value={pwd.confirm} onChange={e=>setPwd(p=>({...p,confirm:e.target.value}))} required /></div>
            </div>
            <p style={{fontSize:12,color:'#6b7280',margin:'0 0 12px'}}>Minimum 8 characters</p>
            <button type="submit" className="maint-btn primary" disabled={saving}>{saving?'Saving...':'Change Password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
