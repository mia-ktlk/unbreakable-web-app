-- Raise profile photo upload limit to 10MB (typical iPhone camera roll photos).
update storage.buckets
set file_size_limit = 10485760
where id = 'profile-photos';
