export async function grantAdministrator(client,email,grant=false){
 await client.query('BEGIN');
 try{
  const row=(await client.query('SELECT id,display_name,email FROM teachers WHERE lower(email)=lower($1) FOR UPDATE',[email])).rows[0];
  if(!row)throw Error('No existing account matches that email. Create the account normally first.');
  if((await client.query('SELECT suspended FROM account_controls WHERE teacher_id=$1',[row.id])).rows[0]?.suspended)throw Error('Restore this account before granting administrator access.');
  let status='preview';
  if(grant){
   if((await client.query('SELECT teacher_id FROM admin_accounts WHERE teacher_id=$1 AND active',[row.id])).rows.length)status='existing';
   else{
    await client.query('INSERT INTO admin_accounts(teacher_id,active) VALUES($1,true) ON CONFLICT(teacher_id) DO UPDATE SET active=true',[row.id]);
    // actor_id is UUID, target_id is text: use independent parameters.
    await client.query('INSERT INTO admin_events(id,actor_id,action,target_id,reason,payload) VALUES($1,$2,$3,$4,$5,$6)',[crypto.randomUUID(),row.id,'ADMIN_ACCESS_GRANTED',String(row.id),'Granted by trusted server operator CLI',JSON.stringify({source:'operator-cli'})]);
    status='granted';
   }
  }
  await client.query('COMMIT');return {teacher:row,status};
 }catch(error){await client.query('ROLLBACK');throw error;}
}
